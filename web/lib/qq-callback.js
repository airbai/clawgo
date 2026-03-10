const { createPrivateKey, createPublicKey, sign, verify } = require('node:crypto');

const MAX_BODY_BYTES = 1024 * 1024;
const CALLBACK_ACK_OP = 12;
const HEARTBEAT_ACK_OP = 11;
const DISPATCH_OP = 0;
const HEARTBEAT_OP = 1;
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const DEFAULT_REPLY_MODE = 'echo';
const DEFAULT_FIXED_REPLY = 'Claw Go 官方回调已接通。';

function getHeaderValue(headers, key) {
  const value = headers[key] || headers[key.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] || '');
  return typeof value === 'string' ? value : '';
}

function readRawBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maxBytes) {
        const error = new Error('body_too_large');
        error.code = 'body_too_large';
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseCallbackPayload(bodyBuffer) {
  if (!bodyBuffer || !bodyBuffer.length) return {};
  try {
    return JSON.parse(bodyBuffer.toString('utf8'));
  } catch {
    const error = new Error('invalid_json');
    error.code = 'invalid_json';
    throw error;
  }
}

function getSeedBuffer(secret) {
  const base = Buffer.from(String(secret || ''), 'utf8');
  if (!base.length) {
    const error = new Error('qqbot_secret_missing');
    error.code = 'qqbot_secret_missing';
    throw error;
  }
  let seed = Buffer.from(base);
  while (seed.length < 32) {
    seed = Buffer.concat([seed, seed]);
  }
  return seed.subarray(0, 32);
}

function getKeyPair(secret) {
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, getSeedBuffer(secret)]),
    format: 'der',
    type: 'pkcs8'
  });
  return { privateKey, publicKey: createPublicKey(privateKey) };
}

function getSignedContent(timestamp, bodyBuffer) {
  return Buffer.concat([Buffer.from(String(timestamp || ''), 'utf8'), bodyBuffer]);
}

function verifyIncomingSignature(headers, bodyBuffer, secret) {
  const timestamp = getHeaderValue(headers, 'x-signature-timestamp');
  const signatureHex = getHeaderValue(headers, 'x-signature-ed25519');
  if (!timestamp || !signatureHex) return false;
  try {
    const signature = Buffer.from(signatureHex, 'hex');
    return verify(null, getSignedContent(timestamp, bodyBuffer), getKeyPair(secret).publicKey, signature);
  } catch {
    return false;
  }
}

function generateResponseSignature(secret, timestamp, plainToken) {
  return sign(
    null,
    getSignedContent(timestamp, Buffer.from(String(plainToken || ''), 'utf8')),
    getKeyPair(secret).privateKey
  ).toString('hex');
}

function isValidationPayload(payload) {
  return Boolean(payload && payload.d && typeof payload.d.plain_token === 'string' && payload.d.event_ts);
}

function isHeartbeatPayload(payload) {
  return Number(payload && payload.op) === HEARTBEAT_OP;
}

function isDispatchPayload(payload) {
  return Number(payload && payload.op) === DISPATCH_OP;
}

function buildValidationResponse(payload, secret) {
  return {
    plain_token: payload.d.plain_token,
    signature: generateResponseSignature(secret, payload.d.event_ts, payload.d.plain_token)
  };
}

function buildHeartbeatAck(payload) {
  return {
    op: HEARTBEAT_ACK_OP,
    d: typeof payload?.d === 'number' ? payload.d : 0
  };
}

function buildDispatchAck(success = true) {
  return {
    op: CALLBACK_ACK_OP,
    d: success ? 0 : 1
  };
}

function extractC2CMessage(payload) {
  if (!payload || payload.t !== 'C2C_MESSAGE_CREATE' || !payload.d) return null;
  return {
    id: String(payload.d.id || ''),
    content: typeof payload.d.content === 'string' ? payload.d.content : '',
    openid:
      payload.d.author && typeof payload.d.author.user_openid === 'string'
        ? payload.d.author.user_openid
        : '',
    authorId:
      payload.d.author && typeof payload.d.author.id === 'string'
        ? payload.d.author.id
        : ''
  };
}

function getReplyMode() {
  const mode = String(process.env.QQBOT_CALLBACK_REPLY_MODE || DEFAULT_REPLY_MODE).trim().toLowerCase();
  return mode === 'none' || mode === 'fixed' || mode === 'echo' ? mode : DEFAULT_REPLY_MODE;
}

function normalizeReplySource(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function buildAutoReply(message) {
  const mode = getReplyMode();
  if (mode === 'none') return '';
  if (mode === 'fixed') {
    return String(process.env.QQBOT_CALLBACK_REPLY_TEXT || DEFAULT_FIXED_REPLY).trim() || DEFAULT_FIXED_REPLY;
  }
  const source = normalizeReplySource(message && message.content);
  if (!source) return DEFAULT_FIXED_REPLY;
  return `Claw Go 官方回调已接通。\n你刚发的是：${source}`;
}

module.exports = {
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
};
