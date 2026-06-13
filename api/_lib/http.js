export function setCorsHeaders(res, headers = {}) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
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
