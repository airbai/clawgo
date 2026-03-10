const { toggleFollowCompat } = require('../lib/social-store');
const { parseJson, sendJson, handleError } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
  try {
    const body = await parseJson(req);
    sendJson(res, 200, await toggleFollowCompat(body.target_profile_id));
  } catch (error) {
    handleError(res, error);
  }
};
