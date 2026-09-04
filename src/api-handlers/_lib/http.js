export function setCorsHeaders(res, headers = {}) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

// Origins allowed to call privileged endpoints. Public storefront reads
// (jobs-public, blog-public, platform-reviews-public, sitemap) deliberately
// keep `Access-Control-Allow-Origin: *` because vendors serve stores from their
// own custom domains - but admin, payment and account endpoints should not be
// scriptable from arbitrary websites.
const ALLOWED_ORIGINS = new Set([
  'https://sellapage.com.ng',
  'https://www.sellapage.com.ng',
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : []),
]);

/**
 * Reflects the request Origin only when it is explicitly allowed, instead of
 * echoing `*`. Note this app authenticates with bearer tokens rather than
 * cookies, so `*` was not classic CSRF - but it did let any site script the
 * admin API from a visitor's browser, masking the true source of abuse.
 */
export function applyCors(req, res, { methods = 'GET,POST,OPTIONS' } = {}) {
  const origin = req.headers?.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function sendJson(res, statusCode, body, headers = {}) {
  setCorsHeaders(res, headers);
  return res.status(statusCode).json(body);
}

export function sendText(res, statusCode, body, headers = {}) {
  setCorsHeaders(res, headers);
  return res.status(statusCode).send(body);
}

export function getHeader(req, key) {
  const headerValue = req.headers?.[key] ?? req.headers?.[key.toLowerCase()] ?? req.headers?.[key.toUpperCase()];
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

export function getBearerToken(req) {
  const authHeader = getHeader(req, 'authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
}

export function parseJsonBody(req) {
  const body = req.body;

  if (body == null || body === '') {
    return {};
  }

  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body;
}

export async function readRawBody(req) {
  if (typeof req.body === 'string') {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (req.body && typeof req.body === 'object' && req.readableEnded) {
    throw new Error('Raw request body is unavailable because the request body was already parsed.');
  }

  return await new Promise((resolve, reject) => {
    let data = '';

    req.setEncoding?.('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
