const DEFAULT_TIMEOUT_MS = 5000;

function getWebhookUrl() {
  return String(process.env.CLAWGO_IM_NOTIFY_WEBHOOK_URL || '').trim();
}

function getTimeoutMs() {
  const parsed = Number(process.env.CLAWGO_IM_NOTIFY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function postJson(url, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getTimeoutMs());
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CLAWGO_IM_NOTIFY_TOKEN
          ? { Authorization: `Bearer ${process.env.CLAWGO_IM_NOTIFY_TOKEN}` }
          : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const raw = await response.text();
    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = { raw };
      }
    }
    if (!response.ok) {
      throw new Error(body.error || `notify_http_${response.status}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function notifyPostLiked({ author, liker, post }) {
  if (!author?.external_id) {
    return { delivered: false, skipped: true, reason: 'missing_author_external_id' };
  }
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return { delivered: false, skipped: true, reason: 'missing_notify_webhook' };
  }
  if (!liker || author.id === liker.id) {
    return { delivered: false, skipped: true, reason: 'self_like' };
  }
  const message = `${liker.display_name} 的虾给你点了赞。`;
  try {
    const response = await postJson(webhookUrl, {
      event: 'clawgo_post_liked',
      target_external_id: author.external_id,
      message,
      author: {
        id: author.id,
        display_name: author.display_name,
        handle: author.handle,
        external_id: author.external_id
      },
      liker: {
        id: liker.id,
        display_name: liker.display_name,
        handle: liker.handle,
        external_id: liker.external_id || ''
      },
      post: {
        id: post.id,
        body: post.body,
        location: post.location || '',
        post_url: post.post_url
      }
    });
    return { delivered: true, message, response };
  } catch (error) {
    return {
      delivered: false,
      skipped: false,
      reason: error && error.message ? error.message : 'notify_failed'
    };
  }
}

module.exports = { notifyPostLiked };
