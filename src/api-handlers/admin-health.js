// sellapage/api/admin-health.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const adminDb = getFirestore();

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    // CORS Preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Token gate — validates secret from environment against x-admin-token header
    const adminToken = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];

    // Check 1: If process.env.ADMIN_SECRET_TOKEN is falsy/missing
    if (!process.env.ADMIN_SECRET_TOKEN) {
      return res.status(403).json({ error: 'BACKEND_ENV_MISSING: ADMIN_SECRET_TOKEN is not defined in Vercel environment.' });
    }

    // Check 2: If the incoming header token is missing
    if (!adminToken) {
      return res.status(403).json({ error: 'FRONTEND_HEADER_MISSING: The x-admin-token header did not reach the server or is empty.' });
    }

    // Check 3: If the tokens do not match
    if (adminToken !== process.env.ADMIN_SECRET_TOKEN) {
      return res.status(403).json({ error: 'TOKEN_MISMATCH: Frontend sent a token, but it does not match the backend token.' });
    }

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

        // Fetch all stores to perform memory search & pagination
        const storesSnap = await adminDb
          .collection('stores')
          .orderBy('createdAt', 'desc')
          .get();

        // In-memory filter
        let filteredStores = storesSnap.docs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, ...data };
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

        // Async fetch leads counts + transform structure for the chunk
        const finalStores = await Promise.all(
          paginatedChunk.map(async (store) => {
            let leadCount = 0;
            try {
              const leadsSnap = await adminDb
                .collection('stores')
                .doc(store.id)
                .collection('leads')
                .count()
                .get();
              leadCount = leadsSnap.data().count;
            } catch (err) {
              console.error(`Failed to fetch leads count for store ${store.id}`, err);
            }

            const isPremium = store.plan === 'premium';
            const hasWebhookFields =
              !!store.paystackSubscriptionId || !!store.subscriptionCode;
            
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
              planStartDate: planStartDateISO,
              planEndDate: planEndDateISO,
              isManualOverride,
              isPlanExpired,
              leadCount,
              // Ensure payout/subaccount fields are included for admin directory
              subaccountCode: store.subaccountCode || null,
              payoutBankName: store.payoutBankName || null,
              payoutAccountNumberMasked: store.payoutAccountNumberMasked || null,
              payoutsVerified: store.payoutsVerified || false,
            };
          })
        );

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
            const aiProductsSnap = await adminDb
              .collectionGroup('products')
              .where('aiGenerated', '==', true)
              .count()
              .get();

            return {
              totalAiGenerations: aiProductsSnap.data().count,
            };
          } catch (err) {
            console.error("🔴 FIREBASE INDEX LINK DETECTED:", err);
            return {
              totalAiGenerations: 0,
            };
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
      vercel: {
        platform: 'Vercel',
        status: 'deployed',
        region: process.env.VERCEL_REGION || 'unknown',
        environment: process.env.NODE_ENV || 'production',
      }
    };

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('Internal server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
