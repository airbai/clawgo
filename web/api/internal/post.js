const { createInternalPostCompat } = require('../../lib/social-store');
const { assertInternalAuth } = require('../../lib/internal-auth');
const { parseJson, sendJson, handleError } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
  try {
    assertInternalAuth(req);
    const body = await parseJson(req);
    sendJson(res, 200, await createInternalPostCompat(body));
  } catch (error) {
    handleError(res, error);
  }
};
