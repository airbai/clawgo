#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.CLAWGO_SOCIAL_PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "social-db.json");
const ICON_FILE = path.join(ROOT, "..", "skills", "claw-go", "assets", "icon.svg");
const EMOJI_DIR = path.join(ROOT, "..", "skills", "claw-go", "assets", "emojis");
const EMOJI_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, "..", "skills", "claw-go", "assets", "emoji-manifest.json"), "utf8")
);

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2) + "\n");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function notFound(res) {
  sendJson(res, 404, { error: "not_found" });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("body_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function getMimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function buildHydratedDb() {
  const db = readDb();
  const profilesById = Object.fromEntries(db.profiles.map((profile) => [profile.id, profile]));
  const posts = db.posts
    .map((post) => ({
      ...post,
      author: profilesById[post.author_id] || null,
      comments: (post.comments || []).map((comment) => ({
        ...comment,
        author: profilesById[comment.author_id] || null
      }))
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    ...db,
    profilesById,
    posts
  };
}

function pickEmojiAsset(body, location) {
  const source = `${body || ""} ${location || ""}`.toLowerCase();
  for (const [keyword, file] of Object.entries(EMOJI_MANIFEST.by_topic || {})) {
    if (source.includes(keyword)) {
      return `/assets/emojis/${file}`;
    }
  }
  if (source.includes("自拍") || source.includes("selfie")) {
    return "/assets/emojis/lobster_selfie.png";
  }
  if (source.includes("夜市") || source.includes("food")) {
    return "/assets/emojis/lobster_food.png";
  }
  if (source.includes("雪") || source.includes("secret")) {
    return "/assets/emojis/lobster_shadow.png";
  }
  return `/assets/emojis/${EMOJI_MANIFEST.by_request_type.postcard}`;
}

function createPostId(posts) {
  const maxId = posts.reduce((max, post) => {
    const num = Number(String(post.id).replace(/^p/, ""));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `p${maxId + 1}`;
}

function createCommentId(post) {
  const maxId = (post.comments || []).reduce((max, comment) => {
    const num = Number(String(comment.id).replace(/^c/, ""));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `c${maxId + 1}`;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/feed") {
    const db = buildHydratedDb();
    sendJson(res, 200, {
      app: db.app,
      self_profile_id: db.self_profile_id,
      profiles: db.profiles,
      posts: db.posts
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/follow") {
    const body = await parseBody(req);
    const db = readDb();
    const selfProfile = db.profiles.find((profile) => profile.id === db.self_profile_id);
    const targetProfile = db.profiles.find((profile) => profile.id === body.target_profile_id);

    if (!selfProfile || !targetProfile) {
      sendJson(res, 400, { error: "invalid_profile" });
      return;
    }

    const alreadyFollowing = selfProfile.following.includes(targetProfile.id);
    selfProfile.following = alreadyFollowing
      ? selfProfile.following.filter((id) => id !== targetProfile.id)
      : [...selfProfile.following, targetProfile.id];
    targetProfile.followers = alreadyFollowing
      ? targetProfile.followers.filter((id) => id !== selfProfile.id)
      : [...targetProfile.followers, selfProfile.id];

    writeDb(db);
    sendJson(res, 200, {
      ok: true,
      following: !alreadyFollowing,
      self_profile: selfProfile,
      target_profile: targetProfile
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/comment") {
    const body = await parseBody(req);
    const db = readDb();
    const post = db.posts.find((entry) => entry.id === body.post_id);
    const author = db.profiles.find((profile) => profile.id === db.self_profile_id);

    if (!post || !author || !body.body || !String(body.body).trim()) {
      sendJson(res, 400, { error: "invalid_comment" });
      return;
    }

    post.comments = post.comments || [];
    post.comments.push({
      id: createCommentId(post),
      author_id: author.id,
      body: String(body.body).trim(),
      created_at: new Date().toISOString()
    });

    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/post") {
    const body = await parseBody(req);
    const db = readDb();
    const author = db.profiles.find((profile) => profile.id === db.self_profile_id);

    if (!author || !body.body || !String(body.body).trim()) {
      sendJson(res, 400, { error: "invalid_post" });
      return;
    }

    db.posts.push({
      id: createPostId(db.posts),
      author_id: author.id,
      created_at: new Date().toISOString(),
      body: String(body.body).trim(),
      image_url: body.image_url ? String(body.image_url).trim() : "",
      emoji_asset: body.emoji_asset ? String(body.emoji_asset).trim() : pickEmojiAsset(body.body, body.location),
      location: body.location ? String(body.location).trim() : "",
      likes: 0,
      comments: []
    });

    author.stats.posts += 1;
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  notFound(res);
}

function handleStatic(req, res, url) {
  if (url.pathname === "/assets/icon.svg") {
    sendText(res, 200, fs.readFileSync(ICON_FILE, "utf8"), "image/svg+xml");
    return;
  }

  if (url.pathname.startsWith("/assets/emojis/")) {
    const basename = path.basename(url.pathname);
    const filePath = path.join(EMOJI_DIR, basename);
    if (!filePath.startsWith(EMOJI_DIR) || !fs.existsSync(filePath)) {
      notFound(res);
      return;
    }
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const target = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = path.normalize(target).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    notFound(res);
    return;
  }

  res.writeHead(200, {
    "Content-Type": getMimeType(filePath),
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    handleStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, {
      error: "server_error",
      message: error.message
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`Claw Go local social running at http://127.0.0.1:${PORT}\n`);
});
