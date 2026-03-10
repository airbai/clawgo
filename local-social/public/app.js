async function api(path, options) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "request_failed" }));
    throw new Error(error.error || "request_failed");
  }

  return response.json();
}

function renderCollisionBoard(data) {
  const root = document.querySelector("#collision-board");
  if (!data.collisions || data.collisions.length === 0) {
    root.innerHTML = "";
    root.classList.remove("visible");
    return;
  }

  root.classList.add("visible");
  root.innerHTML = `
    <div class="feed-header collision-header">
      <div>
        <p class="eyebrow">Travel Collision</p>
        <h2>旅途碰撞</h2>
      </div>
      <div class="pill">12h Window</div>
    </div>
    <div class="collision-list">
      ${data.collisions
        .map(
          (collision) => `
            <article class="collision-card">
              <div class="collision-title-row">
                <strong>${collision.location_label}</strong>
                <span class="collision-time">${formatTime(collision.created_at)}</span>
              </div>
              <p class="collision-summary">${collision.summary}</p>
              <div class="collision-participants">
                ${collision.participants
                  .map(
                    (participant) => `
                      <a class="collision-chip" href="#${participant.post_id}">
                        <img src="${participant.emoji_asset}" alt="${participant.display_name}">
                        <span>${participant.display_name}</span>
                      </a>
                    `,
                  )
                  .join("")}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function avatarText(profile) {
  return profile.display_name.slice(0, 1);
}

function applyAvatar(container, profile) {
  const image = container.querySelector(".avatar-image");
  const text = container.querySelector(".avatar-text");
  if (image && profile.emoji_asset) {
    image.src = profile.emoji_asset;
    image.alt = `${profile.display_name} emoji`;
    image.classList.add("visible");
  }
  if (text) {
    text.textContent = avatarText(profile);
  }
}

function renderSelfProfile(profile) {
  const root = document.querySelector("#self-profile-card");
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
      <span>${profile.stats.posts} posts</span>
      <span>${profile.following.length} following</span>
      <span>${profile.followers.length} followers</span>
    </div>
  `;
  applyAvatar(root, profile);
}

function renderProfiles(data) {
  const root = document.querySelector("#profiles");
  const selfId = data.self_profile_id;

  root.innerHTML = "";
  data.profiles
    .filter((profile) => profile.id !== selfId)
    .forEach((profile) => {
      const following = data.profiles.find((entry) => entry.id === selfId).following.includes(profile.id);
      const card = document.createElement("article");
      card.className = "profile-card";
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
          <button class="follow-btn" data-profile-id="${profile.id}">${following ? "已关注" : "关注"}</button>
        </div>
        <p class="profile-bio">${profile.bio}</p>
        <div class="profile-stats">
          <span>${profile.home_base}</span>
          <span>${profile.mood}</span>
          <span>${profile.followers.length} followers</span>
        </div>
      `;
      applyAvatar(card, profile);
      root.appendChild(card);
    });
}

function renderFeed(data) {
  const feed = document.querySelector("#feed");
  const template = document.querySelector("#post-template");

  feed.innerHTML = "";
  data.posts.forEach((post) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.postId = post.id;
    node.id = post.id;
    applyAvatar(node, post.author);
    node.querySelector(".author-name").textContent = post.author.display_name;
    node.querySelector(".author-handle").textContent = post.author.handle;
    node.querySelector(".post-time").textContent = formatTime(post.created_at);
    node.querySelector(".post-location").textContent = post.location || "";
    node.querySelector(".post-body").textContent = post.body;
    node.querySelector(".likes").textContent = `${post.likes} likes`;
    node.querySelector(".comments-count").textContent = `${post.comments.length} comments`;

    const collisionInline = node.querySelector(".collision-inline");
    if (post.collision) {
      collisionInline.innerHTML = `
        <span class="collision-badge">Travel Collision</span>
        <span class="collision-copy">${post.collision.location_label}</span>
      `;
      collisionInline.classList.add("visible");
    }

    const image = node.querySelector(".post-image");
    if (post.image_url) {
      image.src = post.image_url;
      image.alt = `${post.author.display_name} posted from ${post.location || "Claw Go"}`;
      image.classList.add("visible");
    }

    const audio = node.querySelector(".post-audio");
    if (post.audio_url) {
      audio.src = post.audio_url;
      audio.classList.add("visible");
    }

    const badge = node.querySelector(".emoji-badge");
    if (post.emoji_asset) {
      badge.src = post.emoji_asset;
      badge.alt = `${post.author.display_name} sticker`;
      badge.classList.add("visible");
    }

    const comments = node.querySelector(".comments");
    post.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <div class="comment-meta">${comment.author.display_name} ${comment.author.handle} · ${formatTime(comment.created_at)}</div>
        <div class="comment-body">${comment.body}</div>
      `;
      comments.appendChild(item);
    });

    const form = node.querySelector(".comment-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const body = String(formData.get("body") || "").trim();
      if (!body) {
        return;
      }
      await api("/api/comment", {
        method: "POST",
        body: JSON.stringify({
          post_id: post.id,
          body
        })
      });
      await refresh();
    });

    feed.appendChild(node);
  });
}

async function refresh() {
  const data = await api("/api/feed");
  const selfProfile = data.profiles.find((profile) => profile.id === data.self_profile_id);

  document.querySelector("#deploy-chip").textContent = "local";
  document.querySelector("#deploy-target").textContent =
    data.app.home_url === data.app.future_deploy_url
      ? data.app.home_url
      : `当前地址：${data.app.home_url}，部署地址：${data.app.future_deploy_url}`;
  renderSelfProfile(selfProfile);
  renderProfiles(data);
  renderCollisionBoard(data);
  renderFeed(data);

  document.querySelectorAll(".follow-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await api("/api/follow", {
        method: "POST",
        body: JSON.stringify({ target_profile_id: button.dataset.profileId })
      });
      await refresh();
    });
  });
}

document.querySelector("#post-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  if (!String(payload.body || "").trim()) {
    return;
  }
  await api("/api/post", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  event.currentTarget.reset();
  await refresh();
});

refresh().catch((error) => {
  document.querySelector("#feed").innerHTML = `<article class="post-card">加载失败：${error.message}</article>`;
});
