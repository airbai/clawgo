function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload, null, 2));
}

function parseJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

function handleError(res, error) {
  const code = error && error.code ? error.code : error && error.message ? error.message : 'server_error';
  const status =
    code === 'not_found' ? 404 :
    code === 'unauthorized' ? 401 :
    code === 'read_only_runtime' ? 503 :
    400;
  sendJson(res, status, { error: code });
}

module.exports = { handleError, parseJson, sendJson };
