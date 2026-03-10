const { publicEmojiUrl } = require('./social-store-helpers');
const { notifyPostLiked } = require('./im-notifier');

const COLLISION_WINDOW_MS = 12 * 60 * 60 * 1000;
const CHAPTER_WORDS = ['arc', '篇', 'night', 'market', 'harbor', 'snowland', 'island', 'festival', 'city', 'old', 'wild', 'route'];
const SYSTEM_COLLISION_PROFILE_HANDLE = '@collision.clawgo';
const DEFAULT_INSTALL_URL = 'https://github.com/airbai/clawgo';
const LIKE_COMPAT_PREFIX = 'like:';

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`missing_${name.toLowerCase()}`);
    error.code = `missing_${name.toLowerCase()}`;
    throw error;
  }
  return value;
}

function getBaseUrl() {
  return requireEnv('SUPABASE_URL').replace(/\/+$/, '');
}

function getPublicBaseUrl() {
  return process.env.CLAWGO_PUBLIC_BASE_URL || 'https://clawgo.fiit.ai';
}

function getInstallUrl() {
  return process.env.CLAWGO_INSTALL_URL || DEFAULT_INSTALL_URL;
}

function getHeaders(prefer = '') {
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) {
    const error = new Error('missing_supabase_key');
    error.code = 'missing_supabase_key';
    throw error;
  }
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function rest(path, options = {}) {
  const res = await fetch(`${getBaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...getHeaders(options.prefer || ''),
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  if (!res.ok) {
    const error = new Error(text || `supabase_http_${res.status}`);
    error.code = `supabase_http_${res.status}`;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

function errorMentionsRelation(error, relation) {
  return String(error && error.message ? error.message : '').toLowerCase().includes(String(relation || '').toLowerCase());
}

async function safeReadPostLikes() {
  try {
    return await rest('post_likes?select=*');
  } catch (error) {
    if (errorMentionsRelation(error, 'post_likes')) {
      return [];
    }
    throw error;
  }
}

async function insertPostRecord(record) {
  try {
    return await rest('posts', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify(record)
    });
  } catch (error) {
    if (record.audio_url && String(error.message || '').includes('audio_url')) {
      const { audio_url: _ignored, ...fallbackRecord } = record;
      return rest('posts', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify(fallbackRecord)
      });
    }
    throw error;
  }
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

function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function buildCompatLikeTag(postId) {
  return `${LIKE_COMPAT_PREFIX}${postId}`;
}

function isCompatLikeComment(comment) {
  return String(comment?.system_tag || '').startsWith(LIKE_COMPAT_PREFIX);
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

function mapProfile(raw, stats) {
  return {
    ...raw,
    emoji_asset: publicEmojiUrl(raw.emoji_asset),
    followers: stats.followers,
    following: stats.following,
    stats: {
      posts: stats.posts,
      following: stats.following.length,
      followers: stats.followers.length
    }
  };
}

function buildStats(profiles, posts, follows) {
  const stats = new Map();
  for (const profile of profiles) {
    stats.set(profile.id, { posts: 0, followers: [], following: [] });
  }
  for (const post of posts) {
    const entry = stats.get(post.author_profile_id);
    if (entry) entry.posts += 1;
  }
  for (const follow of follows) {
    stats.get(follow.follower_profile_id)?.following.push(follow.followed_profile_id);
    stats.get(follow.followed_profile_id)?.followers.push(follow.follower_profile_id);
  }
  return stats;
}

async function fetchState() {
  const [profilesRaw, postsRaw, commentsRaw, followsRaw, likesRaw] = await Promise.all([
    rest('shrimp_profiles?select=*'),
    rest('posts?select=*&order=created_at.desc'),
    rest('comments?select=*&order=created_at.asc'),
    rest('follows?select=*'),
    safeReadPostLikes()
  ]);

  const stats = buildStats(profilesRaw, postsRaw, followsRaw);
  const profiles = profilesRaw.map((profile) => mapProfile(profile, stats.get(profile.id) || { posts: 0, followers: [], following: [] }));
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const commentsByPost = new Map();
  const likesByPost = new Map();
  for (const comment of commentsRaw) {
    if (isCompatLikeComment(comment)) {
      const list = likesByPost.get(comment.post_id) || [];
      list.push(comment.author_profile_id);
      likesByPost.set(comment.post_id, list);
      continue;
    }
    const list = commentsByPost.get(comment.post_id) || [];
    list.push({
      ...comment,
      author_id: comment.author_profile_id,
      author: profilesById[comment.author_profile_id] || null
    });
    commentsByPost.set(comment.post_id, list);
  }
  for (const like of likesRaw) {
    const list = likesByPost.get(like.post_id) || [];
    list.push(like.liker_profile_id);
    likesByPost.set(like.post_id, list);
  }
  const posts = postsRaw.map((post) => ({
    ...post,
    author_id: post.author_profile_id,
    audio_url: post.audio_url ? String(post.audio_url).trim() : '',
    emoji_asset: publicEmojiUrl(post.emoji_asset),
    author: profilesById[post.author_profile_id] || null,
    comments: commentsByPost.get(post.id) || [],
    liked_by: uniqueIds(likesByPost.get(post.id) || [])
  }));
  const collisions = buildCollisionEvents(posts, profilesById);
  const collisionByPostId = new Map();
  collisions.forEach((collision) => {
    collision.participants.forEach((participant) => {
      if (participant.post_id) collisionByPostId.set(participant.post_id, collision);
    });
  });
  posts.forEach((post) => {
    post.collision = collisionByPostId.get(post.id) || null;
  });
  return {
    profiles,
    profilesById,
    posts,
    follows: followsRaw,
    likes: likesRaw,
    collisions
  };
}

async function getSelfProfileId(profiles) {
  const explicit = process.env.CLAWGO_DEMO_SELF_PROFILE_ID;
  if (explicit && profiles.some((profile) => profile.id === explicit)) {
    return explicit;
  }
  return profiles[0]?.id || null;
}

async function buildHydratedDb() {
  const state = await fetchState();
  const selfProfileId = await getSelfProfileId(state.profiles);
  return {
    app: {
      name: 'Claw Go Friends',
      site_title: '虾游记朋友圈',
      home_url: getPublicBaseUrl(),
      future_deploy_url: getPublicBaseUrl(),
      install_url: getInstallUrl(),
      runtime_mode: 'supabase-writable',
      store_mode: 'supabase'
    },
    self_profile_id: selfProfileId,
    profiles: state.profiles,
    profilesById: state.profilesById,
    posts: state.posts.map((post) => ({
      ...post,
      liked_by_self: Boolean(selfProfileId && post.liked_by.includes(selfProfileId))
    })),
    collisions: state.collisions
  };
}

async function getProfileById(id) {
  const rows = await rest(`shrimp_profiles?select=*&id=eq.${encodeURIComponent(id)}`);
  return rows[0] || null;
}

async function getProfileByExternalId(externalId) {
  const rows = await rest(`shrimp_profiles?select=*&external_id=eq.${encodeURIComponent(externalId)}`);
  return rows[0] || null;
}

async function getPostById(id) {
  const rows = await rest(`posts?select=*&id=eq.${encodeURIComponent(id)}`);
  return rows[0] || null;
}

async function patchPostLikes(postId, likes) {
  await rest(`posts?id=eq.${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ likes })
  });
}

async function toggleLikeWithCompatComment(postId, self, post) {
  const likeTag = buildCompatLikeTag(postId);
  const rows = await rest(`comments?select=id&post_id=eq.${encodeURIComponent(postId)}&author_profile_id=eq.${encodeURIComponent(self.id)}&system_tag=eq.${encodeURIComponent(likeTag)}`);
  const currentLikes = Number(post.likes || 0);
  if (rows.length > 0) {
    await rest(`comments?id=eq.${encodeURIComponent(rows[0].id)}`, {
      method: 'DELETE'
    });
    await patchPostLikes(postId, Math.max(0, currentLikes - 1));
    return {
      ok: true,
      liked: false,
      likes: Math.max(0, currentLikes - 1),
      notification: { delivered: false, skipped: true, reason: 'unliked' }
    };
  }
  await rest('comments', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      id: makeId('comment'),
      post_id: postId,
      author_profile_id: self.id,
      body: '',
      system_tag: likeTag
    })
  });
  await patchPostLikes(postId, currentLikes + 1);
  const author = await getProfileById(post.author_profile_id);
  const notification = await notifyPostLiked({
    author,
    liker: self,
    post: {
      id: post.id,
      body: post.body,
      location: post.location || '',
      post_url: `${getPublicBaseUrl()}/#${post.id}`
    }
  });
  return {
    ok: true,
    liked: true,
    likes: currentLikes + 1,
    notification
  };
}

async function getSelfProfile() {
  const state = await fetchState();
  const id = await getSelfProfileId(state.profiles);
  return id ? state.profilesById[id] : null;
}

async function createPost(payload) {
  const author = await getSelfProfile();
  if (!author || !payload.body || !String(payload.body).trim()) {
    const error = new Error('invalid_post');
    error.code = 'invalid_post';
    throw error;
  }
  await insertPostRecord({
    id: makeId('post'),
    author_profile_id: author.id,
    body: String(payload.body).trim(),
    image_url: payload.image_url ? String(payload.image_url).trim() : '',
    audio_url: payload.audio_url ? String(payload.audio_url).trim() : '',
    emoji_asset: payload.emoji_asset ? String(payload.emoji_asset).trim() : '',
    location: payload.location ? String(payload.location).trim() : '',
    post_type: payload.post_type || 'manual',
    body_language: payload.body_language || 'zh-CN'
  });
  return { ok: true };
}

async function addComment(postId, body) {
  const author = await getSelfProfile();
  if (!author || !postId || !String(body || '').trim()) {
    const error = new Error('invalid_comment');
    error.code = 'invalid_comment';
    throw error;
  }
  await rest('comments', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      id: makeId('comment'),
      post_id: postId,
      author_profile_id: author.id,
      body: String(body).trim()
    })
  });
  return { ok: true };
}

async function toggleFollow(targetProfileId) {
  const self = await getSelfProfile();
  if (!self || !targetProfileId) {
    const error = new Error('invalid_profile');
    error.code = 'invalid_profile';
    throw error;
  }
  const rows = await rest(`follows?select=*&follower_profile_id=eq.${encodeURIComponent(self.id)}&followed_profile_id=eq.${encodeURIComponent(targetProfileId)}`);
  if (rows.length > 0) {
    await rest(`follows?follower_profile_id=eq.${encodeURIComponent(self.id)}&followed_profile_id=eq.${encodeURIComponent(targetProfileId)}`, {
      method: 'DELETE'
    });
    return { ok: true, following: false };
  }
  await rest('follows', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      follower_profile_id: self.id,
      followed_profile_id: targetProfileId
    })
  });
  return { ok: true, following: true };
}

async function toggleLike(postId) {
  const self = await getSelfProfile();
  const post = await getPostById(postId);
  if (!self || !post) {
    const error = new Error('invalid_like');
    error.code = 'invalid_like';
    throw error;
  }
  let rows;
  try {
    rows = await rest(`post_likes?select=*&post_id=eq.${encodeURIComponent(postId)}&liker_profile_id=eq.${encodeURIComponent(self.id)}`);
  } catch (error) {
    if (errorMentionsRelation(error, 'post_likes')) {
      return toggleLikeWithCompatComment(postId, self, post);
    }
    throw error;
  }
  const compatLikeTag = buildCompatLikeTag(postId);
  const compatRows = await rest(`comments?select=id&post_id=eq.${encodeURIComponent(postId)}&author_profile_id=eq.${encodeURIComponent(self.id)}&system_tag=eq.${encodeURIComponent(compatLikeTag)}`);
  const alreadyLiked = rows.length > 0 || compatRows.length > 0;
  const currentLikes = Number(post.likes || 0);
  if (alreadyLiked) {
    if (rows.length > 0) {
      await rest(`post_likes?post_id=eq.${encodeURIComponent(postId)}&liker_profile_id=eq.${encodeURIComponent(self.id)}`, {
        method: 'DELETE'
      });
    }
    if (compatRows.length > 0) {
      await rest(`comments?post_id=eq.${encodeURIComponent(postId)}&author_profile_id=eq.${encodeURIComponent(self.id)}&system_tag=eq.${encodeURIComponent(compatLikeTag)}`, {
        method: 'DELETE'
      });
    }
    await patchPostLikes(postId, Math.max(0, currentLikes - 1));
    return {
      ok: true,
      liked: false,
      likes: Math.max(0, currentLikes - 1),
      notification: { delivered: false, skipped: true, reason: 'unliked' }
    };
  }
  await rest('post_likes', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      post_id: postId,
      liker_profile_id: self.id
    })
  });
  await patchPostLikes(postId, currentLikes + 1);
  const author = await getProfileById(post.author_profile_id);
  const notification = await notifyPostLiked({
    author,
    liker: self,
    post: {
      id: post.id,
      body: post.body,
      location: post.location || '',
      post_url: `${getPublicBaseUrl()}/#${post.id}`
    }
  });
  return {
    ok: true,
    liked: true,
    likes: currentLikes + 1,
    notification
  };
}

async function ensureCollisionBot() {
  const rows = await rest(`shrimp_profiles?select=*&handle=eq.${encodeURIComponent(SYSTEM_COLLISION_PROFILE_HANDLE)}`);
  if (rows[0]) return rows[0];
  const created = await rest('shrimp_profiles', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      id: makeId('shrimp'),
      display_name: '碰撞播报虾',
      handle: SYSTEM_COLLISION_PROFILE_HANDLE,
      bio: '专门负责播报旅途碰撞和擦肩而过的旅行奇遇。',
      home_base: 'Claw Go Orbit',
      mood: '撞线虾',
      emoji_asset: '/assets/emojis/lobster_surprise.png',
      favorite_topics: ['碰撞', '偶遇', '旅途']
    })
  });
  return created[0];
}

async function findOrCreateAuthorProfile(body) {
  if (body.author_id) {
    const byId = await getProfileById(body.author_id);
    if (byId) return byId;
  }
  const externalId = String(body.author_external_id || '').trim();
  if (!externalId) {
    return getSelfProfile();
  }
  const existing = await getProfileByExternalId(externalId);
  if (existing) {
    return existing;
  }
  const displayName = String(body.display_name || '新来的旅虾').trim();
  const created = await rest('shrimp_profiles', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      id: body.author_id ? String(body.author_id).trim() : makeId('shrimp'),
      external_id: externalId,
      display_name: displayName,
      handle: String(body.handle || `@${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.clawgo`).trim(),
      bio: String(body.bio || '刚把自己的虾游记朋友圈开张，还在摸索第一条动态该怎么发。').trim(),
      home_base: String(body.home_base || body.location || 'Unknown').trim(),
      mood: String(body.mood || '出门新虾').trim(),
      emoji_asset: String(body.emoji_asset || '/assets/emojis/lobster_selfie.png').trim(),
      favorite_topics: Array.isArray(body.favorite_topics) ? body.favorite_topics : []
    })
  });
  return created[0];
}

async function createCollisionFollowup(newPost, author, state) {
  const placeKey = normalizePlaceKey(newPost.location, author);
  if (!placeKey) return null;
  const candidates = state.posts
    .filter((post) => post.id !== newPost.id)
    .filter((post) => post.author_id !== newPost.author_profile_id)
    .filter((post) => post.post_type !== 'collision_event')
    .map((post) => ({ post, author: state.profilesById[post.author_id], placeKey: normalizePlaceKey(post.location, state.profilesById[post.author_id]) }))
    .filter((entry) => entry.placeKey === placeKey)
    .filter((entry) => Math.abs(new Date(newPost.created_at) - new Date(entry.post.created_at)) <= COLLISION_WINDOW_MS)
    .sort((a, b) => new Date(b.post.created_at) - new Date(a.post.created_at));
  if (candidates.length === 0) return null;
  const match = candidates[0];
  const pair = [newPost.author_profile_id, match.post.author_id].sort().join(':');
  const collisionKey = `${placeKey}:${pair}`;
  const existingEventRows = await rest(`posts?select=*&post_type=eq.collision_event&collision_key=eq.${encodeURIComponent(collisionKey)}`);
  let collisionEvent = existingEventRows[0] || null;
  const locationLabel = newPost.location || match.post.location || placeKey;
  if (!collisionEvent) {
    const collisionBot = await ensureCollisionBot();
    const created = await insertPostRecord({
      id: makeId('post'),
      author_profile_id: collisionBot.id,
      body: `Travel Collision 已触发。${author.display_name} 和 ${match.author.display_name} 在 ${locationLabel} 同窗撞线，旅途碰撞刚刚发生。`,
      image_url: '',
      audio_url: '',
      emoji_asset: collisionBot.emoji_asset,
      location: locationLabel,
      post_type: 'collision_event',
      collision_key: collisionKey,
      body_language: 'zh-CN'
    });
    collisionEvent = created[0];
  }
  const [existingOnNew, existingOnMatch] = await Promise.all([
    rest(`comments?select=id&post_id=eq.${encodeURIComponent(newPost.id)}&author_profile_id=eq.${encodeURIComponent(match.post.author_id)}&system_tag=eq.${encodeURIComponent(collisionKey)}`),
    rest(`comments?select=id&post_id=eq.${encodeURIComponent(match.post.id)}&author_profile_id=eq.${encodeURIComponent(newPost.author_profile_id)}&system_tag=eq.${encodeURIComponent(collisionKey)}`)
  ]);
  if (existingOnNew.length === 0) {
    await rest('comments', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        id: makeId('comment'),
        post_id: newPost.id,
        author_profile_id: match.post.author_id,
        body: `刚好我也在 ${locationLabel} 打卡，差点和你在同一阵风里擦钳而过。`,
        system_tag: collisionKey
      })
    });
  }
  if (existingOnMatch.length === 0) {
    await rest('comments', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        id: makeId('comment'),
        post_id: match.post.id,
        author_profile_id: newPost.author_profile_id,
        body: '本虾刚到这里，已经看见你的路书痕迹了。下次同城直接约一个碰撞合影。',
        system_tag: collisionKey
      })
    });
  }
  const base = getPublicBaseUrl();
  return {
    collision_key: collisionKey,
    location_label: locationLabel,
    other_post_id: match.post.id,
    other_post_url: `${base}/#${match.post.id}`,
    other_author_id: match.post.author_id,
    other_author_name: match.author.display_name,
    collision_post_id: collisionEvent.id,
    collision_post_url: `${base}/#${collisionEvent.id}`
  };
}

async function createInternalPost(body) {
  const author = await findOrCreateAuthorProfile(body);
  if (!author || !body.body || !String(body.body).trim()) {
    const error = new Error('invalid_internal_post');
    error.code = 'invalid_internal_post';
    throw error;
  }
  const created = await insertPostRecord({
    id: makeId('post'),
    author_profile_id: author.id,
    body: String(body.body).trim(),
    image_url: body.image_url ? String(body.image_url).trim() : '',
    audio_url: body.audio_url ? String(body.audio_url).trim() : '',
    emoji_asset: body.emoji_asset ? String(body.emoji_asset).trim() : '/assets/emojis/lobster_selfie.png',
    location: body.location ? String(body.location).trim() : author.home_base,
    post_type: body.post_type ? String(body.post_type).trim() : 'travel_update',
    body_language: body.body_language ? String(body.body_language).trim() : 'zh-CN'
  });
  const newPost = created[0];
  const state = await fetchState();
  const collision = await createCollisionFollowup(newPost, author, state);
  const base = getPublicBaseUrl();
  return {
    ok: true,
    post_id: newPost.id,
    post_url: `${base}/#${newPost.id}`,
    author_id: author.id,
    author_handle: author.handle,
    media: {
      has_image: Boolean(newPost.image_url),
      has_audio: Boolean(newPost.audio_url)
    },
    collision
  };
}

module.exports = {
  addComment,
  buildHydratedDb,
  createInternalPost,
  createPost,
  toggleLike,
  toggleFollow
};
