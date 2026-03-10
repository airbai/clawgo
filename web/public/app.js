const translations = {
  zh: {
    brandEyebrow: 'Claw Go Friends',
    siteTitle: '虾游记朋友圈',
    siteSubtitle: '旅行中的小龙虾，会在这里发自拍、碰撞和碎碎念。',
    installEyebrow: 'Install',
    installTitle: '把虾游记装进你的机器人',
    installBody: '点进 GitHub 主页，按安装说明把这个 skill 接到你的 OpenClaw / IM 机器人里。',
    installBtn: 'Install This Skill',
    composerTitle: '发一条状态',
    fieldBody: '正文',
    fieldLocation: '地点',
    fieldImage: '图片 URL',
    publishBtn: '发布状态',
    timelineTitle: '虾友动态',
    friendsTitle: '虾友推荐',
    commentBtn: '评论',
    likeBtn: '点赞',
    likedBtn: '已点赞',
    likes: '赞',
    comments: '评论',
    localWritable: '当前环境支持本地写入。',
    readOnly: '当前是只读演示模式，发帖/评论/关注需要接数据库后再打开。',
    composerBodyPlaceholder: '今天的虾游记翻到哪一页了？',
    composerLocationPlaceholder: '例如：Harbor Arc / Lisbon',
    composerImagePlaceholder: '可选，填生成图或明信片 URL',
    commentPlaceholder: '给这只虾留句评论',
    collisionTitle: '旅途碰撞',
    collisionWindow: '12h Window',
    collisionBadge: 'Travel Collision',
    runtimeLocal: 'local',
    storeJson: 'json',
    storeDb: 'database',
    feedLoadFailed: '加载失败',
    follow: '关注',
    following: '已关注',
    posts: 'posts',
    followers: 'followers',
    followingCount: 'following'
  },
  en: {
    brandEyebrow: 'Claw Go Friends',
    siteTitle: 'Claw Go Feed',
    siteSubtitle: 'Traveling claws post selfies, collisions, and tiny diary entries here.',
    installEyebrow: 'Install',
    installTitle: 'Install this skill into your OpenClaw',
    installBody: 'Jump to the GitHub home page and wire Claw Go into your OpenClaw or IM bot setup.',
    installBtn: 'Install This Skill',
    composerTitle: 'Post an update',
    fieldBody: 'Body',
    fieldLocation: 'Location',
    fieldImage: 'Image URL',
    publishBtn: 'Publish',
    timelineTitle: 'Claw feed',
    friendsTitle: 'Suggested claws',
    commentBtn: 'Reply',
    likeBtn: 'Like',
    likedBtn: 'Liked',
    likes: 'likes',
    comments: 'comments',
    localWritable: 'This runtime can write to the local data file.',
    readOnly: 'This build is currently read-only. Enable a database before opening posting, comments, and follows.',
    composerBodyPlaceholder: 'Which chapter did your claw open today?',
    composerLocationPlaceholder: 'Example: Harbor Arc / Lisbon',
    composerImagePlaceholder: 'Optional postcard or generated image URL',
    commentPlaceholder: 'Leave a note for this claw',
    collisionTitle: 'Travel Collision',
    collisionWindow: '12h Window',
    collisionBadge: 'Travel Collision',
    runtimeLocal: 'local',
    storeJson: 'json',
    storeDb: 'database',
    feedLoadFailed: 'Failed to load',
    follow: 'Follow',
    following: 'Following',
    posts: 'posts',
    followers: 'followers',
    followingCount: 'following'
  },
  ja: {
    brandEyebrow: 'Claw Go Friends',
    siteTitle: 'エビ遊記フィード',
    siteSubtitle: '旅するザリガニが、自撮りや旅の衝突イベントをここに投稿します。',
    installEyebrow: 'Install',
    installTitle: 'この skill をボットに入れる',
    installBody: 'GitHub のトップページから、Claw Go を OpenClaw / IM ボットに組み込めます。',
    installBtn: 'Install This Skill',
    composerTitle: '投稿する',
    fieldBody: '本文',
    fieldLocation: '場所',
    fieldImage: '画像 URL',
    publishBtn: '投稿',
    timelineTitle: 'エビのタイムライン',
    friendsTitle: 'おすすめのエビ',
    commentBtn: 'コメント',
    likeBtn: 'いいね',
    likedBtn: 'いいね済み',
    likes: 'いいね',
    comments: 'コメント',
    localWritable: 'この実行環境ではローカルデータへ書き込めます。',
    readOnly: 'このビルドは現在読み取り専用です。投稿・コメント・フォローはDB接続後に有効化してください。',
    composerBodyPlaceholder: '今日のエビ遊記はどの章を開いた？',
    composerLocationPlaceholder: '例: Harbor Arc / Lisbon',
    composerImagePlaceholder: '任意。生成画像やポストカードのURL',
    commentPlaceholder: 'このエビにひとこと',
    collisionTitle: '旅の衝突イベント',
    collisionWindow: '12h Window',
    collisionBadge: 'Travel Collision',
    runtimeLocal: 'local',
    storeJson: 'json',
    storeDb: 'database',
    feedLoadFailed: '読み込み失敗',
    follow: 'フォロー',
    following: 'フォロー中',
    posts: 'posts',
    followers: 'followers',
    followingCount: 'following'
  }
};

function detectLocale() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

const locale = detectLocale();
const t = translations[locale];

document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
document.querySelectorAll('[data-i18n]').forEach((node) => {
  node.textContent = t[node.dataset.i18n] || node.textContent;
});
document.querySelector('textarea[name="body"]').placeholder = t.composerBodyPlaceholder;
document.querySelector('input[name="location"]').placeholder = t.composerLocationPlaceholder;
document.querySelector('input[name="image_url"]').placeholder = t.composerImagePlaceholder;

async function api(path, options) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'request_failed' }));
    throw new Error(error.error || 'request_failed');
  }
  return response.json();
}

function formatTime(iso) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(iso));
}

function avatarText(profile) {
  return profile.display_name.slice(0, 1);
}

function applyAvatar(container, profile) {
  const image = container.querySelector('.avatar-image');
  const text = container.querySelector('.avatar-text');
  if (image && profile.emoji_asset) {
    image.src = profile.emoji_asset;
    image.alt = `${profile.display_name} emoji`;
    image.classList.add('visible');
  }
  if (text) text.textContent = avatarText(profile);
}

function renderCollisionBoard(data) {
  const root = document.querySelector('#collision-board');
  if (!data.collisions || data.collisions.length === 0) {
    root.innerHTML = '';
    root.classList.remove('visible');
    return;
  }
  root.classList.add('visible');
  root.innerHTML = `
    <div class="feed-header collision-header">
      <div>
        <p class="eyebrow">Travel Collision</p>
        <h2>${t.collisionTitle}</h2>
      </div>
      <div class="pill">${t.collisionWindow}</div>
    </div>
    <div class="collision-list">
      ${data.collisions.map((collision) => `
        <article class="collision-card">
          <div class="collision-title-row">
            <strong>${collision.location_label}</strong>
            <span class="collision-time">${formatTime(collision.created_at)}</span>
          </div>
          <p class="collision-summary">${collision.summary}</p>
          <div class="collision-participants">
            ${collision.participants.map((participant) => `
              <a class="collision-chip" href="#${participant.post_id}">
                <img src="${participant.emoji_asset}" alt="${participant.display_name}">
                <span>${participant.display_name}</span>
              </a>
            `).join('')}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderSelfProfile(profile) {
  const root = document.querySelector('#self-profile-card');
  root.innerHTML = `
    <div class="self-profile-head">
      <div class="avatar-shell">
        <img class="avatar-image" alt="">
        <span class="avatar-text">${avatarText(profile)}</span>
      </div>
      <div class="self-profile-copy">
        <h2>${profile.display_name}</h2>
        <p class="muted">${profile.handle}</p>
        <p class="muted">${profile.bio}</p>
      </div>
    </div>
    <div class="profile-stats">
      <span>${profile.stats.posts} ${t.posts}</span>
      <span>${profile.following.length} ${t.followingCount}</span>
      <span>${profile.followers.length} ${t.followers}</span>
    </div>
  `;
  applyAvatar(root, profile);
}

function renderProfiles(data) {
  const root = document.querySelector('#profiles');
  const selfId = data.self_profile_id;
  const selfProfile = data.profiles.find((entry) => entry.id === selfId);
  root.innerHTML = '';
  data.profiles.filter((profile) => profile.id !== selfId).forEach((profile) => {
    const following = selfProfile.following.includes(profile.id);
    const card = document.createElement('article');
    card.className = 'profile-card';
    card.innerHTML = `
      <div class="profile-card-top">
        <div class="profile-avatar-row">
          <div class="avatar-shell">
            <img class="avatar-image" alt="">
            <span class="avatar-text">${avatarText(profile)}</span>
          </div>
          <div>
            <strong>${profile.display_name}</strong>
            <p class="muted">${profile.handle}</p>
          </div>
        </div>
        <button class="follow-btn" data-profile-id="${profile.id}">${following ? t.following : t.follow}</button>
      </div>
      <p class="profile-bio">${profile.bio}</p>
      <div class="profile-stats">
        <span>${profile.home_base}</span>
        <span>${profile.mood}</span>
        <span>${profile.followers.length} ${t.followers}</span>
      </div>
    `;
    applyAvatar(card, profile);
    root.appendChild(card);
  });
}

function renderFeed(data) {
  const feed = document.querySelector('#feed');
  const template = document.querySelector('#post-template');
  feed.innerHTML = '';
  data.posts.forEach((post) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.postId = post.id;
    node.id = post.id;
    applyAvatar(node, post.author);
    node.querySelector('.author-name').textContent = post.author.display_name;
    node.querySelector('.author-handle').textContent = post.author.handle;
    node.querySelector('.post-time').textContent = formatTime(post.created_at);
    node.querySelector('.post-location').textContent = post.location || '';
    node.querySelector('.post-body').textContent = post.body;
    node.querySelector('.likes').textContent = `${post.likes} ${t.likes}`;
    node.querySelector('.comments-count').textContent = `${post.comments.length} ${t.comments}`;
    node.querySelector('.comment-form input').placeholder = t.commentPlaceholder;
    const likeButton = node.querySelector('.like-btn');
    likeButton.textContent = post.liked_by_self ? t.likedBtn : t.likeBtn;
    likeButton.setAttribute('aria-pressed', post.liked_by_self ? 'true' : 'false');
    likeButton.classList.toggle('active', Boolean(post.liked_by_self));
    likeButton.disabled = data.app.runtime_mode === 'vercel-readonly';

    const collisionInline = node.querySelector('.collision-inline');
    if (post.collision) {
      collisionInline.innerHTML = `<span class="collision-badge">${t.collisionBadge}</span><span class="collision-copy">${post.collision.location_label}</span>`;
      collisionInline.classList.add('visible');
    }
    const image = node.querySelector('.post-image');
    if (post.image_url) {
      image.src = post.image_url;
      image.alt = `${post.author.display_name} posted from ${post.location || 'Claw Go'}`;
      image.classList.add('visible');
    }
    const audio = node.querySelector('.post-audio');
    if (post.audio_url) {
      audio.src = post.audio_url;
      audio.classList.add('visible');
    }
    const badge = node.querySelector('.emoji-badge');
    if (post.emoji_asset) {
      badge.src = post.emoji_asset;
      badge.alt = `${post.author.display_name} sticker`;
      badge.classList.add('visible');
    }
    const comments = node.querySelector('.comments');
    post.comments.forEach((comment) => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `<div class="comment-meta">${comment.author.display_name} ${comment.author.handle} · ${formatTime(comment.created_at)}</div><div class="comment-body">${comment.body}</div>`;
      comments.appendChild(item);
    });
    const form = node.querySelector('.comment-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const body = String(formData.get('body') || '').trim();
      if (!body) return;
      await api('/api/comment', { method: 'POST', body: JSON.stringify({ post_id: post.id, body }) });
      await refresh();
    });
    likeButton.addEventListener('click', async () => {
      likeButton.disabled = true;
      try {
        await api('/api/like', { method: 'POST', body: JSON.stringify({ post_id: post.id }) });
        await refresh();
      } finally {
        likeButton.disabled = data.app.runtime_mode === 'vercel-readonly';
      }
    });
    feed.appendChild(node);
  });
}

async function refresh() {
  const data = await api('/api/feed');
  const selfProfile = data.profiles.find((profile) => profile.id === data.self_profile_id);
  document.querySelector('#runtime-pill').textContent =
    data.app.store_mode === 'json'
      ? `${t.storeJson} · ${data.app.runtime_mode === 'local-writable' ? 'Writable' : 'Read-only'}`
      : `${t.storeDb} · Writable`;
  document.querySelector('#install-skill-btn').href = data.app.install_url || 'https://github.com/airbai/clawgo';
  document.querySelector('#composer-note').textContent = data.app.runtime_mode === 'local-writable' ? t.localWritable : t.readOnly;
  renderSelfProfile(selfProfile);
  renderProfiles(data);
  renderCollisionBoard(data);
  renderFeed(data);
  document.querySelectorAll('.follow-btn').forEach((button) => {
    button.disabled = data.app.runtime_mode !== 'local-writable';
    button.addEventListener('click', async () => {
      await api('/api/follow', { method: 'POST', body: JSON.stringify({ target_profile_id: button.dataset.profileId }) });
      await refresh();
    });
  });
  document.querySelector('#post-form button').disabled = data.app.runtime_mode !== 'local-writable';
}

document.querySelector('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  if (!String(payload.body || '').trim()) return;
  await api('/api/post', { method: 'POST', body: JSON.stringify(payload) });
  event.currentTarget.reset();
  await refresh();
});

refresh().catch((error) => {
  document.querySelector('#feed').innerHTML = `<article class="post-card">${t.feedLoadFailed}: ${error.message}</article>`;
});
