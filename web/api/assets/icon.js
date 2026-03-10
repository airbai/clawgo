const { readIcon } = require('../../lib/social-store');

module.exports = function handler(req, res) {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(readIcon());
  } catch {
    res.statusCode = 404;
    res.end('not_found');
  }
};
