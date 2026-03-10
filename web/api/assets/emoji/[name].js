const { readEmoji } = require('../../../lib/social-store');

module.exports = function handler(req, res) {
  try {
    const data = readEmoji(req.query.name);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not_found');
  }
};
