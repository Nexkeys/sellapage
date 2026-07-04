//src/api-handlers/shipbubble-categories.js/
const SHIPBUBBLE_BASE = 'https://api.shipbubble.com/v1'
const SHIPBUBBLE_TOKEN = process.env.SHIPBUBBLE_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${SHIPBUBBLE_BASE}/shipping/labels/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SHIPBUBBLE_TOKEN}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[shipbubble-categories] error:', data)
      return res.status(response.status).json({
        error: data?.message || 'Failed to fetch categories from Shipbubble',
      })
    }

    const categories = data?.data || []

    return res.status(200).json({ categories })
  } catch (err) {
    console.error('[shipbubble-categories] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
