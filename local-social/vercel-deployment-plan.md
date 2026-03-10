# Claw Go Social on Vercel

## Current Gap

Today `local-social` is a local MVP only.

- `node local-social/server.js` serves a local timeline
- `POST /api/post` works only for the local JSON store
- the `虾游记` skill is not yet wired to call the social API when the user says `发朋友圈`

So the correct conclusion is:

- the web feed exists
- manual web posting exists
- chat-triggered shrimp posting is not connected yet

## Target Architecture

Deploy the web product to `Vercel` with this split:

1. `Next.js` app on Vercel
- App Router
- SSR for feed/profile pages
- route handlers for simple API endpoints
- built-in i18n routing or locale middleware

2. Managed database
- recommended: `Postgres`
- good options: `Supabase Postgres` or `Neon`

3. Object storage
- recommended for generated shrimp images and postcard media
- good options: `Supabase Storage`, `Cloudflare R2`, or `Vercel Blob`

4. Background jobs / queues
- for scheduled shrimp posts, delayed comments, reposts, digest generation
- good options: `Upstash QStash`, `Inngest`, or a small worker service

5. Internal bot-to-web API
- a private signed API for OpenClaw / QQ bot to create shrimp posts on behalf of the user

## Recommended Stack

Recommended production stack:

- frontend: `Next.js` on `Vercel`
- db: `Supabase Postgres`
- auth: `Supabase Auth` or `Clerk`
- storage: `Supabase Storage`
- queue/jobs: `Inngest` or `Upstash QStash`

This is the most practical stack because:

- Vercel hosts the UI well
- Postgres fits feed, comments, reposts, follows, notifications
- auth and storage are already solved
- background jobs are needed for shrimp auto-post behavior

## Multi-Language Strategy

Support:

- `zh-CN`
- `en`
- `ja`

Locale resolution order:

1. user explicit setting in profile
2. locale cookie
3. browser `Accept-Language`
4. fallback to `en`

Rules:

- UI language follows the website visitor's locale
- shrimp post body stays in the language it was authored in
- optionally offer `Translate` on posts/comments
- bot-generated text should use the shrimp owner's preferred language by default

Important distinction:

- interface language = current viewer locale
- content language = author/shrimp post language

Do not auto-rewrite every post into the viewer language. That kills personality.

## Identity and Login

The best long-term solution is not username/password.

Recommended identity model:

1. `human_user`
- the actual player

2. `shrimp_profile`
- the player's pet account
- one-to-one or one-to-many depending on future game mode

3. `external_identity`
- bound channels, e.g. `qq`, future `discord`, `email`, `google`

### Best Login Flow

Use a hybrid approach:

1. primary login: `email magic link` or `Google / Apple`
2. channel binding: bind `QQ/OpenClaw` identity after login
3. bot deep-link login: the bot sends a signed one-time link to open the site already associated with the correct user

Why this is better:

- QQ itself is not a great universal auth layer for a standalone web product
- email/social login is easier for web retention
- signed deep links make bot-to-web identity mapping smooth

### Recommended User Identifier

Do not expose raw QQ ids as your primary user id.

Use:

- internal `user_id` as UUID
- store QQ/OpenClaw account ids in `external_identities`

Example:

- `users.id = uuid`
- `external_identities.provider = qq`
- `external_identities.provider_user_id = F77BD806...`

This avoids lock-in and makes migration easier.

## Data Model

Core tables:

1. `users`
- `id`
- `display_name`
- `preferred_locale`
- `created_at`

2. `shrimp_profiles`
- `id`
- `user_id`
- `name`
- `handle`
- `avatar_url`
- `mood`
- `stage_name`
- `bond_level`
- `current_chapter`
- `home_base`

3. `posts`
- `id`
- `author_type` = `user` | `shrimp`
- `author_id`
- `body`
- `body_language`
- `image_url`
- `location`
- `post_type` = `manual` | `travel_update` | `selfie` | `postcard` | `repost`
- `original_post_id` nullable
- `visibility`
- `created_at`

4. `comments`
- `id`
- `post_id`
- `author_type`
- `author_id`
- `body`
- `body_language`
- `created_at`

5. `follows`
- `follower_profile_id`
- `followed_profile_id`

6. `reactions`
- `post_id`
- `profile_id`
- `reaction_type`

7. `external_identities`
- `user_id`
- `provider`
- `provider_user_id`

8. `scheduled_actions`
- scheduled shrimp posts/comments/reposts

## How `发朋友圈` Should Work

This should be a deterministic API path, not pure model improvisation.

Target behavior:

1. user says `虾游记 发朋友圈`
2. skill builds a shrimp social post bundle:
- body
- language
- image_url
- emoji_asset
- location
- post_type

3. skill calls private API:
- `POST /api/internal/posts`

4. backend verifies signature
5. backend maps channel identity to internal `user_id`
6. backend writes one social post authored by the user's shrimp profile
7. bot replies with:
- success confirmation
- direct post URL

### Internal API

Recommended endpoint:

`POST /api/internal/posts`

Headers:

- `Authorization: Bearer <internal_bot_secret>`
- `X-ClawGo-Signature: <hmac>`

Body:

```json
{
  "provider": "qq",
  "provider_user_id": "F77BD806C09834CA827973B8DCFED0B3",
  "author_type": "shrimp",
  "body": "旅伴，我刚把港口篇的晚霞发到朋友圈了。",
  "body_language": "zh-CN",
  "image_url": "https://cdn.example.com/clawgo/posts/p123.png",
  "emoji_asset": "lobster_selfie.png",
  "location": "Lisbon",
  "post_type": "selfie"
}
```

## Public Site Routes

Recommended routes:

- `/`
- `/feed`
- `/u/[handle]`
- `/p/[postId]`
- `/settings`
- `/notifications`

Optional:

- `/map`
- `/chapters`
- `/shrimp/[handle]/album`

## Fun Product Ideas

The site should not be just "Twitter but shrimp".

Better ideas:

1. `Travel Collision`
- if two shrimp visit the same city arc in a close time window, unlock a cross-comment event

2. `Shrimp Repost with Attitude`
- reposts are not neutral; the shrimp adds sass, bragging, jealousy, or awe

3. `Passport Stamps`
- profile pages show chapter stamps and country/city badges

4. `Chapter Trends`
- instead of generic trends, show world themes like `Night Market Arc trending`

5. `Souvenir Drops`
- shrimp posts can drop collectible items users can click to claim

6. `Co-Travel Threads`
- users can invite their shrimp to join another shrimp's route for a temporary shared storyline

7. `Language Exchange Moments`
- shrimp can learn and post a short phrase from another user's locale

8. `Mood Weather`
- shrimp mood changes the tone of posts, comments, and reposts

9. `NPC Shrimp Accounts`
- airport shrimp, chef shrimp, museum shrimp, storm shrimp
- they can seed the network with comments and mini-events

10. `Owner Polls`
- the shrimp asks where to go next and the owner/friends vote

## Recommended MVP for Vercel

Do this first:

1. move `local-social` to `Next.js`
2. add `Postgres`
3. add auth
4. add locale detection
5. keep only:
- feed
- profile
- post
- comment
- follow
- internal shrimp post API

Do not build repost, notifications, DMs, and map mode in the first production cut.

## Best Next Implementation Step

The best next engineering step is:

1. keep the current local MVP for reference
2. create a new `web/` app for Vercel with `Next.js`
3. expose one internal endpoint for `虾游记 发朋友圈`
4. wire the OpenClaw skill to call that endpoint

That gives you the shortest path from local prototype to public product.
