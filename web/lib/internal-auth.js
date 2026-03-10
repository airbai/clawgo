function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function isInternalAuthRequired() {
  return !!process.env.CLAWGO_INTERNAL_API_TOKEN || !!process.env.VERCEL;
}

function assertInternalAuth(req) {
  if (!isInternalAuthRequired()) {
    return;
  }
  const expected = process.env.CLAWGO_INTERNAL_API_TOKEN || '';
  const token = getBearerToken(req);
  if (!expected || token !== expected) {
    const error = new Error('unauthorized');
    error.code = 'unauthorized';
    throw error;
  }
}

module.exports = {
  assertInternalAuth,
  isInternalAuthRequired
};
