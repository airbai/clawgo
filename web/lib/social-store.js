const fs = require('fs');
const path = require('path');
const { basenameAsset, publicEmojiUrl } = require('./social-store-helpers');
const { notifyPostLiked } = require('./im-notifier');

const DATA_FILE = path.join(process.cwd(), 'local-social', 'data', 'social-db.json');
const ICON_FILE = path.join(process.cwd(), 'skills', 'claw-go', 'assets', 'icon.svg');
const EMOJI_DIR = path.join(process.cwd(), 'skills', 'claw-go', 'assets', 'emojis');
const EMOJI_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'skills', 'claw-go', 'assets', 'emoji-manifest.json'), 'utf8')
);
const COLLISION_WINDOW_MS = 12 * 60 * 60 * 1000;
const CHAPTER_WORDS = ['arc', '篇', 'night', 'market', 'harbor', 'snowland', 'island', 'festival', 'city', 'old', 'wild', 'route'];
const SYSTEM_COLLISION_PROFILE_ID = 'shrimp_collision_bot';
const DEFAULT_INSTALL_URL = 'https://github.com/airbai/clawgo';

function getStoreMode() {
  return process.env.CLAWGO_SOCIAL_STORE || 'json';
}

function isReadOnlyRuntime() {
  return process.env.CLAWGO_SOCIAL_READONLY === '1' || (!!process.env.VERCEL && getStoreMode() === 'json');
}

function getPublicBaseUrl(app = {}) {
  return process.env.CLAWGO_PUBLIC_BASE_URL || app.future_deploy_url || 'https://clawgo.fiit.ai';
}

function getInstallUrl(app = {}) {
  return process.env.CLAWGO_INSTALL_URL || app.install_url || DEFAULT_INSTALL_URL;
}

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDb(db) {
  if (isReadOnlyRuntime()) {
    const error = new Error('read_only_runtime');
    error.code = 'read_only_runtime';
    throw error;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2) + '\n');
}

function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizePostLikes(post, selfProfileId) {
  const likedBy = uniqueIds(post.liked_by);
  const likes = Number.isFinite(Number(post.likes)) ? Number(post.likes) : likedBy.length;
  return {
    ...post,
    likes,
    liked_by: likedBy,
    liked_by_self: Boolean(selfProfileId && likedBy.includes(selfProfileId))
  };
}

function normalizePlaceKey(location, author) {
  const raw = String(location || author?.home_base || '').trim().toLowerCase();
  if (!raw) return '';
  const tokens = raw
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !CHAPTER_WORDS.includes(token));
  return tokens.slice(0, 2).join(' ');
}

function buildCollisionEvents(posts, profilesById) {
  const collisions = [];
  const seen = new Set();
  for (let i = 0; i < posts.length; i += 1) {
    const left = posts[i];
    const leftAuthor = profilesById[left.author_id];
    const leftKey = normalizePlaceKey(left.location, leftAuthor);
    if (!leftKey) continue;
    for (let j = i + 1; j < posts.length; j += 1) {
      const right = posts[j];
      const rightAuthor = profilesById[right.author_id];
      const rightKey = normalizePlaceKey(right.location, rightAuthor);
      if (!rightKey || left.author_id === right.author_id) continue;
      if (leftKey !== rightKey) continue;
      const gap = Math.abs(new Date(left.created_at) - new Date(right.created_at));
      if (gap > COLLISION_WINDOW_MS) continue;
      const pair = [left.author_id, right.author_id].sort().join(':');
      const collisionId = `${leftKey}:${pair}`;
      if (seen.has(collisionId)) continue;
      seen.add(collisionId);
      collisions.push({
        id: `collision-${collisions.length + 1}`,
        place_key: leftKey,
        location_label: left.location || right.location || leftAuthor?.home_base || rightAuthor?.home_base || leftKey,
        created_at: new Date(Math.max(new Date(left.created_at), new Date(right.created_at))).toISOString(),
        window_hours: 12,
        summary: `${leftAuthor?.display_name || '一只虾'} 和 ${rightAuthor?.display_name || '另一只虾'} 在 ${leftKey} 擦肩而过，触发了 Travel Collision。`,
        participants: [
          {
            id: leftAuthor?.id,
            display_name: leftAuthor?.display_name,
            handle: leftAuthor?.handle,
            emoji_asset: publicEmojiUrl(leftAuthor?.emoji_asset),
            post_id: left.id
          },
          {
            id: rightAuthor?.id,
            display_name: rightAuthor?.display_name,
            handle: rightAuthor?.handle,
            emoji_asset: publicEmojiUrl(rightAuthor?.emoji_asset),
            post_id: right.id
          }
        ]
      });
    }
  }
  return collisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function buildHydratedDb() {
  const db = readDb();
  const profilesById = Object.fromEntries(db.profiles.map((profile) => [profile.id, { ...profile, emoji_asset: publicEmojiUrl(profile.emoji_asset) }]));
  const collisions = buildCollisionEvents(db.posts, profilesById);
  const collisionByPostId = new Map();
  collisions.forEach((collision) => {
    collision.participants.forEach((participant) => {
      if (participant.post_id) collisionByPostId.set(participant.post_id, collision);
    });
  });
  const posts = db.posts
    .map((post) => normalizePostLikes({
      ...post,
      audio_url: post.audio_url ? String(post.audio_url).trim() : '',
      emoji_asset: publicEmojiUrl(post.emoji_asset),
      author: profilesById[post.author_id] || null,
      collision: collisionByPostId.get(post.id) || null,
      comments: (post.comments || []).map((comment) => ({
        ...comment,
        author: profilesById[comment.author_id] || null
      }))
    }, db.self_profile_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const publicBaseUrl = getPublicBaseUrl(db.app);
  return {
    ...db,
    app: {
      ...db.app,
      home_url: publicBaseUrl,
      future_deploy_url: publicBaseUrl,
      install_url: getInstallUrl(db.app),
      runtime_mode: isReadOnlyRuntime() ? 'vercel-readonly' : 'local-writable',
      store_mode: getStoreMode()
    },
    profiles: Object.values(profilesById),
    profilesById,
    collisions,
    posts
  };
}

function pickEmojiAsset(body, location) {
  const source = `${body || ''} ${location || ''}`.toLowerCase();
  for (const [keyword, file] of Object.entries(EMOJI_MANIFEST.by_topic || {})) {
    if (source.includes(keyword)) return `/assets/emojis/${file}`;
  }
  if (source.includes('自拍') || source.includes('selfie')) return '/assets/emojis/lobster_selfie.png';
  if (source.includes('夜市') || source.includes('food')) return '/assets/emojis/lobster_food.png';
  if (source.includes('雪') || source.includes('secret')) return '/assets/emojis/lobster_shadow.png';
  return `/assets/emojis/${EMOJI_MANIFEST.by_request_type.postcard}`;
}

function createPostId(posts) {
  const maxId = posts.reduce((max, post) => {
    const num = Number(String(post.id).replace(/^p/, ''));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `p${maxId + 1}`;
}

function createCommentId(post) {
  const maxId = (post.comments || []).reduce((max, comment) => {
    const num = Number(String(comment.id).replace(/^c/, ''));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `c${maxId + 1}`;
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}

function ensureSystemCollisionProfile(db) {
  let profile = db.profiles.find((entry) => entry.id === SYSTEM_COLLISION_PROFILE_ID);
  if (profile) return profile;
  profile = {
    id: SYSTEM_COLLISION_PROFILE_ID,
    display_name: '碰撞播报虾',
    handle: '@collision.clawgo',
    bio: '专门负责播报旅途碰撞和擦肩而过的旅行奇遇。',
    home_base: 'Claw Go Orbit',
    mood: '撞线虾',
    emoji_asset: '/assets/emojis/lobster_surprise.png',
    favorite_topics: ['碰撞', '偶遇', '旅途'],
    followers: [],
    following: [],
    stats: { posts: 0, following: 0, followers: 0 }
  };
  db.profiles.push(profile);
  return profile;
}

function createProfileId(db) {
  let i = db.profiles.length + 1;
  while (db.profiles.some((profile) => profile.id === `shrimp_user_${i}`)) i += 1;
  return `shrimp_user_${i}`;
}

function findOrCreateAuthorProfile(db, body) {
  if (body.author_id) {
    const byId = db.profiles.find((profile) => profile.id === body.author_id);
    if (byId) return byId;
  }
  const externalId = String(body.author_external_id || '').trim();
  if (!externalId) return db.profiles.find((profile) => profile.id === db.self_profile_id) || null;
  let profile = db.profiles.find((entry) => entry.external_id === externalId);
  if (profile) {
    if (body.display_name) profile.display_name = String(body.display_name).trim();
    if (body.handle) profile.handle = String(body.handle).trim();
    if (body.emoji_asset) profile.emoji_asset = String(body.emoji_asset).trim();
    return profile;
  }
  const displayName = String(body.display_name || '新来的旅虾').trim();
  profile = {
    id: createProfileId(db),
    external_id: externalId,
    display_name: displayName,
    handle: String(body.handle || `@${slugify(displayName || externalId)}.clawgo`).trim(),
    bio: String(body.bio || '刚把自己的虾游记朋友圈开张，还在摸索第一条动态该怎么发。').trim(),
    home_base: String(body.home_base || body.location || 'Unknown').trim(),
    mood: String(body.mood || '出门新虾').trim(),
    emoji_asset: String(body.emoji_asset || '/assets/emojis/lobster_selfie.png').trim(),
    favorite_topics: Array.isArray(body.favorite_topics) ? body.favorite_topics : [],
    followers: [],
    following: [],
    stats: { posts: 0, following: 0, followers: 0 }
  };
  db.profiles.push(profile);
  return profile;
}

function buildCollisionSummary(leftAuthor, rightAuthor, locationLabel) {
  return `${leftAuthor.display_name} 和 ${rightAuthor.display_name} 在 ${locationLabel} 同窗撞线，旅途碰撞刚刚发生。`;
}

function maybeCreateCollisionFollowup(db, newPost) {
  const profilesById = Object.fromEntries(db.profiles.map((profile) => [profile.id, profile]));
  const author = profilesById[newPost.author_id];
  const placeKey = normalizePlaceKey(newPost.location, author);
  if (!placeKey) return null;
  const candidates = db.posts
    .filter((post) => post.id !== newPost.id)
    .filter((post) => post.author_id !== newPost.author_id)
    .filter((post) => post.post_type !== 'collision_event')
    .map((post) => ({ post, author: profilesById[post.author_id], placeKey: normalizePlaceKey(post.location, profilesById[post.author_id]) }))
    .filter((entry) => entry.placeKey === placeKey)
    .filter((entry) => Math.abs(new Date(newPost.created_at) - new Date(entry.post.created_at)) <= COLLISION_WINDOW_MS)
    .sort((a, b) => new Date(b.post.created_at) - new Date(a.post.created_at));
  if (candidates.length === 0) return null;
  const match = candidates[0];
  const leftId = [newPost.author_id, match.post.author_id].sort().join(':');
  const collisionKey = `${placeKey}:${leftId}`;
  const existingEvent = db.posts.find((post) => post.post_type === 'collision_event' && post.collision_key === collisionKey);
  const locationLabel = newPost.location || match.post.location || placeKey;
  let collisionEventPost = existingEvent || null;
  if (!existingEvent) {
    const collisionBot = ensureSystemCollisionProfile(db);
    collisionEventPost = {
      id: createPostId(db.posts),
      author_id: collisionBot.id,
      created_at: new Date().toISOString(),
      body: `Travel Collision 已触发。${buildCollisionSummary(author, match.author, locationLabel)}`,
      image_url: '',
      audio_url: '',
      emoji_asset: collisionBot.emoji_asset,
      location: locationLabel,
      likes: 0,
      liked_by: [],
      comments: [],
      post_type: 'collision_event',
      collision_key: collisionKey
    };
    db.posts.push(collisionEventPost);
    collisionBot.stats.posts += 1;
  }
  newPost.comments = newPost.comments || [];
  match.post.comments = match.post.comments || [];
  if (!newPost.comments.some((comment) => comment.system_tag === collisionKey && comment.author_id === match.post.author_id)) {
    newPost.comments.push({
      id: createCommentId(newPost),
      author_id: match.post.author_id,
      body: `刚好我也在 ${locationLabel} 打卡，差点和你在同一阵风里擦钳而过。`,
      created_at: new Date().toISOString(),
      system_tag: collisionKey
    });
  }
  if (!match.post.comments.some((comment) => comment.system_tag === collisionKey && comment.author_id === newPost.author_id)) {
    match.post.comments.push({
      id: createCommentId(match.post),
      author_id: newPost.author_id,
      body: `本虾刚到这里，已经看见你的路书痕迹了。下次同城直接约一个碰撞合影。`,
      created_at: new Date().toISOString(),
      system_tag: collisionKey
    });
  }
  const baseUrl = getPublicBaseUrl(db.app);
  return {
    collision_key: collisionKey,
    location_label: locationLabel,
    other_post_id: match.post.id,
    other_post_url: `${baseUrl}/#${match.post.id}`,
    other_author_id: match.post.author_id,
    other_author_name: match.author.display_name,
    collision_post_id: collisionEventPost?.id || null,
    collision_post_url: collisionEventPost ? `${baseUrl}/#${collisionEventPost.id}` : null
  };
}

function createPost(payload) {
  const db = readDb();
  const author = db.profiles.find((profile) => profile.id === db.self_profile_id);
  if (!author || !payload.body || !String(payload.body).trim()) {
    const error = new Error('invalid_post');
    error.code = 'invalid_post';
    throw error;
  }
  db.posts.push({
    id: createPostId(db.posts),
    author_id: author.id,
    created_at: new Date().toISOString(),
    body: String(payload.body).trim(),
    image_url: payload.image_url ? String(payload.image_url).trim() : '',
    audio_url: payload.audio_url ? String(payload.audio_url).trim() : '',
    emoji_asset: payload.emoji_asset ? String(payload.emoji_asset).trim() : pickEmojiAsset(payload.body, payload.location),
    location: payload.location ? String(payload.location).trim() : '',
    likes: 0,
    liked_by: [],
    comments: []
  });
  author.stats.posts += 1;
  writeDb(db);
  return { ok: true };
}

function toggleFollow(targetProfileId) {
  const db = readDb();
  const selfProfile = db.profiles.find((profile) => profile.id === db.self_profile_id);
  const targetProfile = db.profiles.find((profile) => profile.id === targetProfileId);
  if (!selfProfile || !targetProfile) {
    const error = new Error('invalid_profile');
    error.code = 'invalid_profile';
    throw error;
  }
  const alreadyFollowing = selfProfile.following.includes(targetProfile.id);
  selfProfile.following = alreadyFollowing ? selfProfile.following.filter((id) => id !== targetProfile.id) : [...selfProfile.following, targetProfile.id];
  targetProfile.followers = alreadyFollowing ? targetProfile.followers.filter((id) => id !== selfProfile.id) : [...targetProfile.followers, selfProfile.id];
  writeDb(db);
  return { ok: true, following: !alreadyFollowing };
}

function addComment(postId, body) {
  const db = readDb();
  const post = db.posts.find((entry) => entry.id === postId);
  const author = db.profiles.find((profile) => profile.id === db.self_profile_id);
  if (!post || !author || !body || !String(body).trim()) {
    const error = new Error('invalid_comment');
    error.code = 'invalid_comment';
    throw error;
  }
  post.comments = post.comments || [];
  post.comments.push({
    id: createCommentId(post),
    author_id: author.id,
    body: String(body).trim(),
    created_at: new Date().toISOString()
  });
  writeDb(db);
  return { ok: true };
}

async function toggleLike(postId) {
  const db = readDb();
  const post = db.posts.find((entry) => entry.id === postId);
  const liker = db.profiles.find((profile) => profile.id === db.self_profile_id);
  const author = post ? db.profiles.find((profile) => profile.id === post.author_id) : null;
  if (!post || !liker || !author) {
    const error = new Error('invalid_like');
    error.code = 'invalid_like';
    throw error;
  }
  post.liked_by = uniqueIds(post.liked_by);
  const alreadyLiked = post.liked_by.includes(liker.id);
  if (alreadyLiked) {
    post.liked_by = post.liked_by.filter((id) => id !== liker.id);
    post.likes = Math.max(0, Number(post.likes || 0) - 1);
  } else {
    post.liked_by.push(liker.id);
    post.likes = Number(post.likes || 0) + 1;
  }
  writeDb(db);
  const postUrl = `${getPublicBaseUrl(db.app)}/#${post.id}`;
  const notification = !alreadyLiked
    ? await notifyPostLiked({
      author,
      liker,
      post: {
        id: post.id,
        body: post.body,
        location: post.location || '',
        post_url: postUrl
      }
    })
    : { delivered: false, skipped: true, reason: 'unliked' };
  return {
    ok: true,
    liked: !alreadyLiked,
    likes: post.likes,
    notification
  };
}

function createInternalPost(body) {
  const db = readDb();
  const author = findOrCreateAuthorProfile(db, body);
  if (!author || !body.body || !String(body.body).trim()) {
    const error = new Error('invalid_internal_post');
    error.code = 'invalid_internal_post';
    throw error;
  }
  const post = {
    id: createPostId(db.posts),
    author_id: author.id,
    created_at: new Date().toISOString(),
    body: String(body.body).trim(),
    image_url: body.image_url ? String(body.image_url).trim() : '',
    audio_url: body.audio_url ? String(body.audio_url).trim() : '',
    emoji_asset: body.emoji_asset ? String(body.emoji_asset).trim() : pickEmojiAsset(body.body, body.location),
    location: body.location ? String(body.location).trim() : author.home_base,
    likes: 0,
    liked_by: [],
    comments: [],
    post_type: body.post_type ? String(body.post_type).trim() : 'travel_update',
    body_language: body.body_language ? String(body.body_language).trim() : 'zh-CN'
  };
  db.posts.push(post);
  author.stats.posts += 1;
  const collision = maybeCreateCollisionFollowup(db, post);
  writeDb(db);
  const baseUrl = getPublicBaseUrl(db.app);
  return {
    ok: true,
    post_id: post.id,
    post_url: `${baseUrl}/#${post.id}`,
    author_id: author.id,
    author_handle: author.handle,
    media: {
      has_image: Boolean(post.image_url),
      has_audio: Boolean(post.audio_url)
    },
    collision
  };
}

function readIcon() {
  return fs.readFileSync(ICON_FILE);
}

function readEmoji(name) {
  const basename = path.basename(name);
  const filePath = path.join(EMOJI_DIR, basename);
  if (!filePath.startsWith(EMOJI_DIR) || !fs.existsSync(filePath)) {
    const error = new Error('not_found');
    error.code = 'not_found';
    throw error;
  }
  return fs.readFileSync(filePath);
}

let supabaseStore = null;
function maybeSupabase() {
  if (getStoreMode() !== 'supabase' && getStoreMode() !== 'postgres') {
    return null;
  }
  if (!supabaseStore) {
    supabaseStore = require('./supabase-store');
  }
  return supabaseStore;
}

async function buildHydratedDbCompat() {
  const store = maybeSupabase();
  if (store) return store.buildHydratedDb();
  return buildHydratedDb();
}

async function createPostCompat(payload) {
  const store = maybeSupabase();
  if (store) return store.createPost(payload);
  return createPost(payload);
}

async function addCommentCompat(postId, body) {
  const store = maybeSupabase();
  if (store) return store.addComment(postId, body);
  return addComment(postId, body);
}

async function toggleFollowCompat(targetProfileId) {
  const store = maybeSupabase();
  if (store) return store.toggleFollow(targetProfileId);
  return toggleFollow(targetProfileId);
}

async function toggleLikeCompat(postId) {
  const store = maybeSupabase();
  if (store) return store.toggleLike(postId);
  return toggleLike(postId);
}

async function createInternalPostCompat(body) {
  const store = maybeSupabase();
  if (store) return store.createInternalPost(body);
  return createInternalPost(body);
}

module.exports = {
  addComment,
  addCommentCompat,
  basenameAsset,
  buildHydratedDb,
  buildHydratedDbCompat,
  createInternalPost,
  createInternalPostCompat,
  createPost,
  createPostCompat,
  getStoreMode,
  isReadOnlyRuntime,
  publicEmojiUrl,
  readEmoji,
  readIcon,
  toggleLike,
  toggleLikeCompat,
  toggleFollowCompat,
  toggleFollow,
  writeDb
};
