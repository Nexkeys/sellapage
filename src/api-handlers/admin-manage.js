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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const adminToken = req.headers['x-admin-token'];
    if (!process.env.ADMIN_SECRET_TOKEN) return res.status(403).json({ error: 'Missing ADMIN_SECRET_TOKEN' });
    if (!adminToken) return res.status(403).json({ error: 'Missing x-admin-token header' });
    if (adminToken !== process.env.ADMIN_SECRET_TOKEN) return res.status(403).json({ error: 'Token mismatch' });

    const action = (req.query.action || 'list');

    if (action === 'list') {
      const snap = await adminDb.collection('admins').get();
      const admins = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        assignedAt: d.data().assignedAt?.toDate?.()?.toISOString() || null,
      }));
      return res.status(200).json({ admins });
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {};
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch {}
      const { uid, role, active } = body;
      if (!uid) return res.status(400).json({ error: 'Missing uid' });
      const update = {};
      if (role !== undefined) update.role = role;
      if (active !== undefined) update.active = active;
      await adminDb.collection('admins').doc(uid).update(update);
      return res.status(200).json({ success: true, uid, updated: update });
    }

    if (action === 'add' && req.method === 'POST') {
      let body = {};
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch {}
      const { uid, role } = body;
      if (!uid || !role) return res.status(400).json({ error: 'Missing uid or role' });
      await adminDb.collection('admins').doc(uid).set({
        role,
        assignedBy: 'manual',
        assignedAt: new Date(),
        active: true,
      });
      return res.status(200).json({ success: true, uid, role });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('admin-manage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
