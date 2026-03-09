# Runtime Architecture

## 1. Components

- `scheduler`: triggers proactive updates in local-time windows
- `command-handler`: handles `/clawgo *` commands
- `state-store`: persists user stats and journey state
- `memory-adapter`: reads and writes preference tags
- `entitlement-client`: checks free/pro access
- `media-generator`: builds image prompts and voice scripts
- `media-bundle`: calls real image and TTS APIs and returns `image_url` plus `audio_path`

## 2. Request Flow (Proactive)

1. Scheduler picks eligible users by timezone and daily quota
2. Runtime loads `user_state` and `memory_tags`
3. Runtime ranks destinations and generates report draft
4. Runtime calls entitlement API for premium fields
5. Runtime generates media bundle with `scripts/generate_media_bundle.js` when media providers are configured
6. Runtime downgrades payload if not entitled
7. Runtime emits final payload (image + voice + cta)
8. Runtime records usage and telemetry

## 3. Request Flow (Slash Command)

1. Parse `/clawgo <action>`
2. Validate action and read current user state
3. If action needs premium: call entitlement API
4. Return response payload and update counters

## 4. Storage Schema (Minimal)

```json
{
  "user_id": "u_123",
  "tier": "free",
  "bond_level": 41,
  "energy": 80,
  "curiosity": 52,
  "streak_days": 5,
  "journal_count": 22,
  "timezone": "Asia/Shanghai",
  "last_destination": "Osaka",
  "last_event_type": "selfie",
  "daily_push_count": 1,
  "active_arc": { "id": "night-market-arc", "step": 2, "max_steps": 4 }
}
```

## 5. Reliability Rules

- If media generation fails: send text-only fallback and retry media async
- If entitlement API fails: fallback to free-tier behavior
- If state write fails: avoid double-send by idempotency key (`user_id + date + slot`)
- If image generation succeeds but TTS fails: still send image plus text
- If TTS succeeds but image generation fails: still send voice plus text
