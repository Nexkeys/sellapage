// sellapage/api/admin-health.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { verifyAdmin } from './_lib/verify-admin.js';
import { getFirestore } from 'firebase-admin/firestore';
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { meter, flushUsage } from './_lib/usage-meter.js'


if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const adminDb = getFirestore();

// ---------------------------------------------------------------------------
// MERCHANT DIRECTORY CACHE
//
// The directory reads EVERY store document, because search and sorting happen
// in memory (see the comment at the query). That is one read per store per
// request, and the client re-requests on every search, every page button,
// every payout filter and after every verify. Opening the tab and clicking
// around a few times used to cost tens of thousands of reads, which on the
// Spark free quota is the difference between a working platform and a dead
// one: on 2026-09-23 the project hit 45k of its 50k daily reads, and the admin
// console started returning 500s.
//
// Module scope survives between invocations on a warm Vercel instance, so the
// scan happens at most once a minute per instance instead of once per click.
// A cold instance simply repeats it.
//
// Sixty seconds is chosen so a mistake is never more than a minute stale, and
// the two paths that MUST be current bypass it: ?fresh=1, and any write in
// this file, which clears it outright.
// ---------------------------------------------------------------------------
const DIRECTORY_TTL_MS = 60 * 1000;
let directoryCache = { at: 0, stores: null };

function clearDirectoryCache() {
  directoryCache = { at: 0, stores: null };
}

async function readAllStores(force) {
  const fresh = !force && directoryCache.stores && Date.now() - directoryCache.at < DIRECTORY_TTL_MS;
  if (fresh) return { stores: directoryCache.stores, cached: true };

  const snap = await adminDb.collection('stores').get();
  // Counted here, inside the cache, so the number reflects scans that actually
  // happened rather than requests that were served from memory.
  meter.reads('admin-directory', snap.size);
  const stores = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  directoryCache = { at: Date.now(), stores };
  return { stores, cached: false };
}

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    applyCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    // CORS Preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Identity gate. The previous three-branch version returned distinct
    // diagnostics (BACKEND_ENV_MISSING / FRONTEND_HEADER_MISSING /
    // TOKEN_MISMATCH) which were useful while debugging but told an attacker
    // exactly how far their guess got. One generic response now.
    const admin = await verifyAdmin(req, 'health');
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const queryParams = req.query || {};
    const action = queryParams.action || 'health';

    // Handle admin action: verify_payout (POST)
    if (req.method === 'POST' && action === 'verify_payout') {
      try {
        let parsedBody = {};
        try { parsedBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch {}
        const { storeId, verified } = parsedBody;
        if (!storeId) {
          return res.status(400).json({ error: 'Missing storeId in request body' });
        }

        await adminDb.collection('stores').doc(storeId).update({ payoutsVerified: !!verified });
        // The directory this admin is looking at just became wrong. Per
        // instance, which is why the client should refetch with ?fresh=1.
        clearDirectoryCache();

        return res.status(200).json({ success: true, storeId, payoutsVerified: !!verified });
      } catch (err) {
        console.error('verify_payout error:', err);
        return res.status(500).json({ error: 'Failed to update payoutsVerified' });
      }
    }

    // ---------------------------------------------------------------------------
    // MODE: DIRECTORY (Paginated Stores Data & Leads)
    // ---------------------------------------------------------------------------
    if (action === 'directory') {
      try {
        const page = parseInt(queryParams.page || '1', 10);
        const limit = parseInt(queryParams.limit || '10', 10);
        const search = (queryParams.search || '').toLowerCase();

        // Fetch all stores to perform memory search & pagination.
        // Deliberately NOT ordered by createdAt in the query: Firestore drops
        // every document missing the field it orders by, so merchants signed up
        // before createdAt was written were absent from this list entirely.
        // Sorting in memory below keeps them, newest first, undated last.
        const { stores: allStores } = await readAllStores(queryParams.fresh === '1');

        // A copy, because the sort below is in place and the cached array is
        // reused by the next request on this instance.
        let filteredStores = allStores.slice();

        const joinedMs = (s) => {
          const d = s.createdAt?.toDate?.() || (s.createdAt ? new Date(s.createdAt) : null);
          return d && !isNaN(d.getTime()) ? d.getTime() : null;
        };
        filteredStores.sort((a, b) => {
          const x = joinedMs(a);
          const y = joinedMs(b);
          if (x === null && y === null) return 0;
          if (x === null) return 1;
          if (y === null) return -1;
          return y - x;
        });

        if (search) {
          filteredStores = filteredStores.filter((s) => {
            const sName = (s.storeName || '').toLowerCase();
            const handle = (s.handle || '').toLowerCase();
            return sName.includes(search) || handle.includes(search);
          });
        }

        // Apply payoutFilter if provided: show only stores with a subaccount and payoutsVerified === false
        if (queryParams.payoutFilter === 'unverified') {
          filteredStores = filteredStores.filter((s) => s.subaccountCode && (s.payoutsVerified === false || !s.payoutsVerified));
        }

        const totalResults = filteredStores.length;
        const totalPages = Math.ceil(totalResults / limit);
        
        // Calculate Pagination Offsets
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedChunk = filteredStores.slice(startIndex, endIndex);

        // Resolve each referrer's store name + referral code for the "Source"
        // column instead of exposing the raw referredBy store ID.
        const referrerIds = [...new Set(paginatedChunk.map((s) => s.referredBy).filter(Boolean))];
        const referrerMap = {};
        if (referrerIds.length) {
          const referrerDocs = await Promise.all(
            referrerIds.map((id) => adminDb.collection('stores').doc(id).get())
          );
          referrerDocs.forEach((doc) => {
            if (doc.exists) {
              const d = doc.data();
              referrerMap[doc.id] = {
                storeName: d.storeName || d.handle || '',
                referralCode: d.referralCode || '',
              };
            }
          });
        }

        // Async fetch leads counts + transform structure for the chunk
        const finalStores = await Promise.all(
          paginatedChunk.map(async (store) => {
            // Products, services and leads counted from the documents rather
            // than any stored productCount field, which drifts the moment a
            // listing is removed and would be hardest to spot here of all
            // places. Count aggregation bills 1 read per 1,000 documents, so
            // this is three cheap reads per merchant on the page being viewed.
            const countSub = async (name) => {
              try {
                const snap = await adminDb
                  .collection('stores')
                  .doc(store.id)
                  .collection(name)
                  .count()
                  .get();
                return snap.data().count;
              } catch (err) {
                console.error(`Failed to count ${name} for store ${store.id}`, err);
                return 0;
              }
            };

            const [leadCount, productCount, serviceCount] = await Promise.all([
              countSub('leads'),
              countSub('products'),
              countSub('services'),
            ]);

            const isPremium = store.plan === 'premium';
            const hasWebhookFields =
              !!store.paystackSubscriptionId || !!store.subscriptionCode;
            
            // The raw value is a Firestore Timestamp, which is useless to the
            // browser once serialised, so send the joined date as ISO.
            const createdAtDate = store.createdAt?.toDate?.() || (store.createdAt ? new Date(store.createdAt) : null);
            const createdAtISO = createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate.toISOString() : null;

            const planStartDateISO = store.planStartDate?.toDate?.()?.toISOString() || store.planStartDate || null;
            const planEndDateISO = store.planEndDate?.toDate?.()?.toISOString() || store.planEndDate || null;

            const hasTimelineBoundaries = !!planStartDateISO || !!planEndDateISO;

            const isManualOverride = isPremium && !hasWebhookFields && !hasTimelineBoundaries;
            
            let isPlanExpired = false;
            if (isPremium && planEndDateISO) {
              const endDate = new Date(planEndDateISO).getTime();
              if (Date.now() > endDate) {
                isPlanExpired = true;
              }
            }

            return {
              ...store, // Ensures 'referredBy' and all dynamic fields flow to the frontend
              id: store.id,
              storeName: store.storeName || '',
              handle: store.handle || '',
              ownerEmail: store.email || store.ownerEmail || '',
              whatsappNumber: store.whatsappNumber || '',
              plan: store.plan || 'starter',
              createdAt: createdAtISO,
              planStartDate: planStartDateISO,
              planEndDate: planEndDateISO,
              isManualOverride,
              isPlanExpired,
              leadCount,
              // What this merchant actually has live, split the way the
              // dashboard splits it: products and services are different things.
              listings: {
                products: productCount,
                services: serviceCount,
                total: productCount + serviceCount,
              },
              // Ensure payout/subaccount fields are included for admin directory
              subaccountCode: store.subaccountCode || null,
              payoutBankName: store.payoutBankName || null,
              payoutAccountNumberMasked: store.payoutAccountNumberMasked || null,
              payoutsVerified: store.payoutsVerified || false,
              referredByStoreName: store.referredBy ? (referrerMap[store.referredBy]?.storeName || '') : null,
              referredByReferralCode: store.referredBy ? (referrerMap[store.referredBy]?.referralCode || '') : null,
            };
          })
        );

        // Persists what this instance has counted. Not forced, so a single
        // page view writes nothing; it only records once enough has built up
        // to be worth a write of its own.
        await flushUsage(adminDb);

        return res.status(200).json({
          stores: finalStores,
          meta: {
            totalResults,
            totalPages,
            currentPage: page,
            limit,
          },
        });
      } catch (err) {
        console.error('Directory error:', err);
        return res.status(500).json({ error: 'Failed to fetch directory data' });
      }
    }

    // ---------------------------------------------------------------------------
    // MODE: HEALTH (Default - Platform, AI, Cloudinary, Vercel Metrics)
    // ---------------------------------------------------------------------------
    const [platformResult, aiResult, cloudinaryResult] =
      await Promise.allSettled([
        // Group 1: Platform Metrics
        (async () => {
          const [
            totalStoresSnap,
            growthSnap,
            proSnap,
            premiumSnap,
            recentStoresSnap,
            productsSnap,
            leadsSnap,
          ] = await Promise.all([
            adminDb.collection('stores').count().get(),
            adminDb.collection('stores').where('plan', '==', 'growth').count().get(),
            adminDb.collection('stores').where('plan', '==', 'pro').count().get(),
            adminDb.collection('stores').where('plan', '==', 'premium').count().get(),
            adminDb.collection('stores').orderBy('createdAt', 'desc').limit(10).get(),
            adminDb.collectionGroup('products').count().get(),
            adminDb.collection('leads').count().get(),
          ]);

          const totalStores = totalStoresSnap.data().count;
          const growthStores = growthSnap.data().count;
          const proStores = proSnap.data().count;
          const premiumStores = premiumSnap.data().count;

          const recentStores = recentStoresSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              businessName: data.businessName || '',
              storeName: data.storeName || '',
              plan: data.plan || 'starter',
              planStatus: data.planStatus || 'active',
              productCount: data.productCount || 0,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
              lastSeen: data.lastSeen?.toDate?.()?.toISOString() || null,
            };
          });

          return {
            totalStores,
            starterStores: totalStores - growthStores - proStores - premiumStores,
            growthStores,
            proStores,
            premiumStores,
            totalProducts: productsSnap.data().count,
            totalLeads: leadsSnap.data().count,
            recentStores,
          };
        })(),

        // Group 2: NVIDIA AI Engine Usage Data
        (async () => {
          try {
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            // Lagos day keys, because that is how ai-describe.js names the
            // daily counter documents it writes.
            const dayKey = (date) => new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(date);
            const todayKey = dayKey(now);
            const weekKey = dayKey(weekStart);
            const monthKey = dayKey(monthStart).slice(0, 7);

            const usageSnap = await adminDb.collectionGroup('aiUsage')
              .select('count', 'date')
              .limit(20000)
              .get();

            let totalAiGenerations = 0;
            let today = 0;
            let thisWeek = 0;
            let thisMonth = 0;
            const stores = new Set();

            usageSnap.docs.forEach((doc) => {
              const d = doc.data();
              const count = Number(d.count) || 0;
              if (count <= 0) return;
              const key = d.date || doc.id;
              totalAiGenerations += count;
              stores.add(doc.ref.path.split('/')[1]);
              if (key === todayKey) today += count;
              if (key >= weekKey) thisWeek += count;
              if (String(key).slice(0, 7) === monthKey) thisMonth += count;
            });

            return {
              totalAiGenerations,
              today,
              thisWeek,
              thisMonth,
              storesUsed: stores.size,
            };
          } catch (err) {
            console.error("AI engine query error:", err.message);
            try {
              const fallback = await adminDb.collectionGroup('products').where('aiGenerated', '==', true).count().get();
              return { totalAiGenerations: fallback.data().count, today: 0, thisWeek: 0, thisMonth: 0, storesUsed: 0 };
            } catch {
              return { totalAiGenerations: 0, today: 0, thisWeek: 0, thisMonth: 0, storesUsed: 0 };
            }
          }
        })(),

        // Group 3: Cloudinary Storage Capacity Metrics
        (async () => {
          const cloudinaryAuth = Buffer.from(
            `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`
          ).toString('base64');

          const cloudRes = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/usage`,
            { headers: { Authorization: `Basic ${cloudinaryAuth}` } }
          );
          const cloudData = await cloudRes.json();

          const storageUsedBytes = cloudData.storage?.usage || 0;
          // 26843545600 bytes = 25 GB fallback limit
          const storageLimitBytes = cloudData.storage?.limit || 26843545600;
          const bandwidthUsedBytes = cloudData.bandwidth?.usage || 0;
          const bandwidthLimitBytes = cloudData.bandwidth?.limit || 26843545600;

          return {
            storageUsedBytes,
            storageLimitBytes,
            storageUsedGB: storageUsedBytes / 1024 ** 3,
            storageLimitGB: storageLimitBytes / 1024 ** 3,
            storagePercent: storageLimitBytes > 0 ? (storageUsedBytes / storageLimitBytes) * 100 : 0,
            bandwidthUsedBytes,
            bandwidthLimitBytes,
            bandwidthPercent: bandwidthLimitBytes > 0 ? (bandwidthUsedBytes / bandwidthLimitBytes) * 100 : 0,
            totalAssets: cloudData.resources || 0,
          };
        })(),
      ]);

    // Construct response document safely isolating failed data metrics
    const responseBody = {
      generatedAt: new Date().toISOString(),
      platform:
        platformResult.status === 'fulfilled' ? platformResult.value : null,
      ai: aiResult.status === 'fulfilled' ? aiResult.value : null,
      cloudinary:
        cloudinaryResult.status === 'fulfilled' ? cloudinaryResult.value : null,
      vercel: (() => {
        const base = {
          platform: 'Vercel',
          status: 'deployed',
          region: process.env.VERCEL_REGION || 'unknown',
          environment: process.env.NODE_ENV || 'production',
          recentDeployments: [],
        };
        if (process.env.VERCEL_TOKEN) {
          base.deploymentsAvailable = true;
        }
        return base;
      })()
    };

    if (process.env.VERCEL_TOKEN) {
      try {
        const depRes = await fetch('https://api.vercel.com/v6/deployments?limit=5&target=production', {
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
        });
        if (depRes.ok) {
          const depData = await depRes.json();
          responseBody.vercel.recentDeployments = (depData.deployments || []).map(d => ({
            id: d.uid,
            url: d.url,
            state: d.state,
            createdAt: d.createdAt,
            commitMessage: d.meta?.commitMessage || '',
            branch: d.meta?.branch || '',
          }));
        }
      } catch (depErr) {
        console.error('Vercel deployments fetch failed:', depErr.message);
      }
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('Internal server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
