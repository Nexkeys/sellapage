// sellapage/netlify/functions/admin-health.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';



const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const adminDb = getFirestore();

export const handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Token gate — validates secret from environment against x-admin-token header
  const adminToken = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];

  // Check 1: If process.env.ADMIN_SECRET_TOKEN is falsy/missing
  if (!process.env.ADMIN_SECRET_TOKEN) {
    return {
      statusCode: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'BACKEND_ENV_MISSING: ADMIN_SECRET_TOKEN is not defined in Netlify/Server environment.' }),
    };
  }

  // Check 2: If the incoming header token is missing
  if (!adminToken) {
    return {
      statusCode: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'FRONTEND_HEADER_MISSING: The x-admin-token header did not reach the server or is empty.' }),
    };
  }

  // Check 3: If the tokens do not match
  if (adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return {
      statusCode: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'TOKEN_MISMATCH: Frontend sent a token, but it does not match the backend token.' }),
    };
  }

  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action || 'health';

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

          const isPremium = store.plan === 'growth' || store.plan === 'pro';
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
          };
        })
      );

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stores: finalStores,
          meta: {
            totalResults,
            totalPages,
            currentPage: page,
            limit,
          },
        }),
      };
    } catch (err) {
      console.error('Directory error:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to fetch directory data' }),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // MODE: HEALTH (Default - Platform, AI, Cloudinary, Netlify Metrics)
  // ---------------------------------------------------------------------------
  const [platformResult, aiResult, cloudinaryResult, netlifyResult] =
    await Promise.allSettled([
      // Group 1: Platform Metrics
      (async () => {
        const [
          totalStoresSnap,
          growthSnap,
          proSnap,
          recentSnap,
          productsSnap,
          leadsSnap,
        ] = await Promise.all([
          adminDb.collection('stores').count().get(),
          adminDb.collection('stores').where('plan', '==', 'growth').count().get(),
          adminDb.collection('stores').where('plan', '==', 'pro').count().get(),
          adminDb.collection('stores').orderBy('createdAt', 'desc').limit(10).get(),
          adminDb.collectionGroup('products').count().get(),
          adminDb.collection('leads').count().get(),
        ]);

        const totalStores = totalStoresSnap.data().count;
        const growthStores = growthSnap.data().count;
        const proStores = proSnap.data().count;

        const recentStores = recentSnap.docs.map((doc) => {
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
          starterStores: totalStores - growthStores - proStores,
          growthStores,
          proStores,
          totalProducts: productsSnap.data().count,
          totalLeads: leadsSnap.data().count,
          recentStores,
        };
      })(),

      // Group 2: Gemini AI Usage Data
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

      // Group 4: Netlify Production Instance Deployment & Traffic Metrics
      (async () => {
        const netlifyHeaders = {
          Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`,
        };

        const [siteRes, accountsRes] = await Promise.all([
          fetch(
            `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}`,
            { headers: netlifyHeaders }
          ),
          fetch('https://api.netlify.com/api/v1/accounts', {
            headers: netlifyHeaders,
          }),
        ]);

        const siteData = await siteRes.json();
        const accounts = await accountsRes.json();

        let bandwidthUsedGB = null;
        let bandwidthLimitGB = null;
        let bandwidthPercent = null;
        let netlifyCredits = null;

        if (Array.isArray(accounts) && accounts.length > 0) {
          const account = accounts[0];
          
          // Bandwidth extraction
          const bandwidthData = account.capabilities?.bandwidth;
          if (bandwidthData) {
            const usedBytes = bandwidthData.used || 0;
            const limitBytes = bandwidthData.allowed || 1;
            bandwidthUsedGB = usedBytes / 1024 ** 3;
            bandwidthLimitGB = limitBytes / 1024 ** 3;
            bandwidthPercent = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
          }

          // Balance extraction (fallback to 0/null gracefully if unauthorized or missing)
          try {
            netlifyCredits = account.billing_details?.balance ?? account.payment_method?.balance ?? null;
          } catch {
            netlifyCredits = null;
          }
        }

        return {
          siteStatus: siteData.published_deploy?.state || 'unknown',
          lastDeployedAt: siteData.published_deploy?.created_at || null,
          sslEnabled: !!siteData.ssl,
          bandwidthUsedGB,
          bandwidthLimitGB,
          bandwidthPercent,
          netlifyCredits,
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
    netlify:
      netlifyResult.status === 'fulfilled' ? netlifyResult.value : null,
  };

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(responseBody),
  };
};
