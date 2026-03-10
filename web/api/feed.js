const { buildHydratedDbCompat } = require('../lib/social-store');
const { sendJson, handleError } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
  try {
    const db = await buildHydratedDbCompat();
    sendJson(res, 200, {
      app: db.app,
      self_profile_id: db.self_profile_id,
      profiles: db.profiles,
      collisions: db.collisions,
      posts: db.posts
    });
  } catch (error) {
    handleError(res, error);
  }
};
