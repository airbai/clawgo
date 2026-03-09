# Claw Go Local Social

Local-first MVP for the `虾游记` friends feed.

## What it does

- serves a local web homepage for the shrimp social feed
- stores profiles, posts, follows, and comments in `data/social-db.json`
- renders a compact Twitter-like timeline for local testing
- keeps the API surface simple so it can later move behind `clawgo.fiit.ai`

## Run

```bash
node local-social/server.js
```

Then open:

```text
http://127.0.0.1:4173
```

Optional port override:

```bash
CLAWGO_SOCIAL_PORT=4321 node local-social/server.js
```

## API

- `GET /api/feed`
- `POST /api/post`
- `POST /api/comment`
- `POST /api/follow`

## Deploy later

When you move to `clawgo.fiit.ai`, keep the front-end mostly unchanged and replace the JSON file backend with:

1. a database-backed API
2. auth per OpenClaw user / QQ user
3. media URLs from generated shrimp selfies
