const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';
const API_BASE = 'https://api.sgroup.qq.com';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cachedToken = null;
let inflightTokenPromise = null;

function getQQBotCredentials() {
  return {
    appId: String(process.env.QQBOT_APP_ID || '').trim(),
    appSecret: String(process.env.QQBOT_APP_SECRET || process.env.QQBOT_CLIENT_SECRET || '').trim()
  };
}

function requireQQBotCredentials() {
  const credentials = getQQBotCredentials();
  if (!credentials.appId || !credentials.appSecret) {
    const error = new Error('qqbot_not_configured');
    error.code = 'qqbot_not_configured';
    throw error;
  }
  return credentials;
}

async function parseResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('invalid_qqbot_response');
    error.code = 'invalid_qqbot_response';
    error.details = raw;
    throw error;
  }
}

async function fetchAccessToken(appId, appSecret) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, clientSecret: appSecret })
  });
  const body = await parseResponse(response);
  if (!response.ok || !body.access_token) {
    const error = new Error(body.message || `qqbot_token_http_${response.status}`);
    error.code = body.code || `qqbot_token_http_${response.status}`;
    throw error;
  }
  cachedToken = {
    token: body.access_token,
    appId,
    expiresAt: Date.now() + Number(body.expires_in || 7200) * 1000
  };
  return cachedToken.token;
}

async function getAccessToken() {
  const { appId, appSecret } = requireQQBotCredentials();
  if (cachedToken && cachedToken.appId === appId && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }
  if (!inflightTokenPromise) {
    inflightTokenPromise = fetchAccessToken(appId, appSecret).finally(() => {
      inflightTokenPromise = null;
    });
  }
  return inflightTokenPromise;
}

async function qqRequest(method, path, body) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `QQBot ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(payload.message || `qqbot_http_${response.status}`);
    error.code = payload.code || `qqbot_http_${response.status}`;
    error.details = payload;
    throw error;
  }
  return payload;
}

function getNextMsgSeq(msgId = '') {
  if (!msgId) return 1;
  const timePart = Date.now() % 100000000;
  const random = Math.floor(Math.random() * 65536);
  return (timePart ^ random) % 65536;
}

async function sendC2CTextMessage({ openid, content, msgId }) {
  if (!openid) {
    const error = new Error('qqbot_missing_openid');
    error.code = 'qqbot_missing_openid';
    throw error;
  }
  return qqRequest('POST', `/v2/users/${encodeURIComponent(openid)}/messages`, {
    content,
    msg_type: 0,
    msg_seq: getNextMsgSeq(msgId),
    ...(msgId ? { msg_id: msgId } : {})
  });
}

module.exports = {
  getQQBotCredentials,
  sendC2CTextMessage
};
