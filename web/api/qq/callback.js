const { sendJson } = require('../_utils');
const { sendC2CTextMessage } = require('../../lib/qq-api');
const {
  buildAutoReply,
  buildDispatchAck,
  buildHeartbeatAck,
  buildValidationResponse,
  extractC2CMessage,
  isDispatchPayload,
  isHeartbeatPayload,
  isValidationPayload,
  parseCallbackPayload,
  readRawBody,
  verifyIncomingSignature
} = require('../../lib/qq-callback');

function isConfigured() {
  return Boolean(
    String(process.env.QQBOT_APP_ID || '').trim() &&
      String(process.env.QQBOT_APP_SECRET || process.env.QQBOT_CLIENT_SECRET || '').trim()
  );
}

function sendCallbackJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      callback_path: '/api/qq/callback',
      configured: isConfigured()
    });
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
  if (!isConfigured()) return sendJson(res, 503, { error: 'qqbot_callback_not_configured' });

  let bodyBuffer;
  try {
    bodyBuffer = await readRawBody(req);
  } catch (error) {
    return sendJson(res, error && error.code === 'body_too_large' ? 413 : 400, {
      error: error && error.code ? error.code : 'invalid_body'
    });
  }

  const secret = String(process.env.QQBOT_APP_SECRET || process.env.QQBOT_CLIENT_SECRET || '').trim();
  if (!verifyIncomingSignature(req.headers, bodyBuffer, secret)) {
    return sendJson(res, 401, { error: 'invalid_signature' });
  }

  let payload;
  try {
    payload = parseCallbackPayload(bodyBuffer);
  } catch (error) {
    return sendJson(res, 400, { error: error && error.code ? error.code : 'invalid_json' });
  }

  if (isValidationPayload(payload)) {
    return sendCallbackJson(res, 200, buildValidationResponse(payload, secret));
  }

  if (isHeartbeatPayload(payload)) {
    return sendCallbackJson(res, 200, buildHeartbeatAck(payload));
  }

  if (!isDispatchPayload(payload)) {
    return sendCallbackJson(res, 200, buildDispatchAck(true));
  }

  const message = extractC2CMessage(payload);
  if (!message || !message.openid) {
    return sendCallbackJson(res, 200, buildDispatchAck(true));
  }

  const reply = buildAutoReply(message);
  if (reply) {
    try {
      await sendC2CTextMessage({
        openid: message.openid,
        content: reply,
        msgId: message.id
      });
    } catch (error) {
      console.error('[qq-callback] reply failed:', error && error.message ? error.message : error);
    }
  }

  return sendCallbackJson(res, 200, buildDispatchAck(true));
};
