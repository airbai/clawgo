# Runtime Architecture

## 1. Components

- `scheduler`: triggers proactive updates in local-time windows
- `command-handler`: handles `/clawgo *` commands
- `state-store`: persists user stats and journey state
- `memory-adapter`: reads and writes preference tags
- `entitlement-client`: checks free/pro access
- `media-generator`: builds image prompts and voice scripts
- `media-bundle`: calls real image and TTS APIs and returns `image_url` plus `audio_path`
- `event-director`: turns raw intents into scene beats, choices, and consequences
- `arc-manager`: tracks chapter progression, recurring props, and payoff moments

## 2. Request Flow (Proactive)

1. Scheduler picks eligible users by timezone and daily quota
2. Runtime loads `user_state` and `memory_tags`
3. Runtime selects or advances the active chapter arc
4. Runtime chooses one event beat: arrival, delay, discovery, meal, weather shift, encounter, or posting moment
5. Runtime ranks destinations and generates a scene draft with a user hook
6. Runtime calls entitlement API for premium fields
7. Runtime generates media bundle with `scripts/generate_media_bundle.js` when media providers are configured
8. Runtime downgrades payload if not entitled
9. Runtime emits final payload as `scene + event + choice hook + media/result + next hook`
10. Runtime records usage, telemetry, and remembered hooks

## 3. Request Flow (Slash Command)

1. Parse `/clawgo <action>`
2. Validate action and read current user state
3. Resolve the current interaction state: `idle`, `traveling`, `waiting_user_choice`, `media_generating`, `posting_social`, or `cooldown`
4. If action needs premium: call entitlement API
5. Return a scene payload and update counters plus arc state

## 4. Interaction Contract

Every meaningful reply should map to one beat in the journey.

Preferred payload shape:

```json
{
  "state": "waiting_user_choice",
  "chapter": "港口篇",
  "scene_opener": "虾导刚踩上傍晚码头的木板桥。",
  "event": "鱼市快收摊了，但远处灯塔刚亮。",
  "user_choices": ["先追晚霞", "去鱼市蹭热闹", "拍一张虾拍"],
  "relationship_beat": "旅伴上次说喜欢海风，所以本虾先绕来港边。",
  "next_hook": "你点一个，本虾马上冲。"
}
```

Rules:

- one reply should center on one event beat
- user can always ignore the suggested choices and answer freely
- low-effort replies like one emoji should still produce a valid next beat
- media and social posts should be embedded as story events, not detached success logs

## 5. Storage Schema (Minimal)

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
  "interaction_state": "waiting_user_choice",
  "active_arc": { "id": "night-market-arc", "step": 2, "max_steps": 4 },
  "active_prop": "sticker_camera",
  "last_choice_options": ["先追晚霞", "去鱼市蹭热闹", "拍一张虾拍"],
  "memory_hooks": ["user likes sea breeze", "shared joke about ferry snacks"]
}
```

## 6. Reliability Rules

- If media generation fails: send text-only fallback and retry media async
- If entitlement API fails: fallback to free-tier behavior
- If state write fails: avoid double-send by idempotency key (`user_id + date + slot`)
- If image generation succeeds but TTS fails: still send image plus text
- If TTS succeeds but image generation fails: still send voice plus text
