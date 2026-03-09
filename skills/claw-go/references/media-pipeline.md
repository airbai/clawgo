# Media Pipeline

## 1. Goals

Support two image paths and one voice path:

- `web_photo`: use found web photos as travel background or reference
- `image_gen`: generate custom mascot-first art with LLM image model
- `tts_voice`: generate short in-character voice notes with LLM TTS

## 2. Image Strategy

Prefer this order:

1. Generate mascot-first art when a reaction sticker, selfie, or stylized postcard is needed
2. Use web-found travel photos when realism matters and rights/source handling is acceptable
3. Combine a real background with mascot overlay only if your image stack supports editing/compositing

Selfie rule:

- If the user asks for `自拍`, `selfie`, `拍张照`, or `给我看看你`, force `image_gen`
- The generated image must include both the mascot and the current travel location
- Do not fall back to web search for selfie requests
- Pick an emoji reference asset from `skills/claw-go/assets/emojis/` and keep the generated face aligned to that asset

Image types:

- `sticker`: transparent or plain background, emotion-forward
- `postcard`: mascot + travel scene, scenic framing
- `selfie`: mascot foreground, local detail in background
- `souvenir-card`: object close-up + mascot reaction

## 3. Voice Strategy

Use AI TTS for all default outbound voice notes.

Language rule:

- Detect user language from latest message plus memory
- Persist it as `user_language`
- Generate `voice_script` in the same language
- Default to Chinese only when language is unclear

Language field:

- `zh`: Chinese text and voice
- `en`: English text and voice
- `mixed`: follow the latest user message language

Voice targets:

- 20-45 seconds
- warm, energetic, slightly smug
- natural pause after opener
- one sensory detail
- one closing prompt

Recommended speaking structure:

1. opener
2. location + chapter
3. one funny event
4. one sensory detail
5. closing CTA

## 4. Provider Config

These env vars are expected when wiring real providers:

- `CLAWGO_IMAGE_MODE=generate|web|hybrid`
- `CLAWGO_IMAGE_API_BASE`
- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_IMAGE_MODEL`
- `CLAWGO_TTS_API_BASE`
- `CLAWGO_TTS_API_KEY`
- `CLAWGO_TTS_MODEL`
- `CLAWGO_TTS_VOICE`

Current configured provider:

- image provider: `SiliconFlow`
- image model: `Kwai-Kolors/Kolors`
- tts provider: `SiliconFlow`
- tts model: `fnlp/MOSS-TTSD-v0.5`

Local smoke test script:

- `scripts/test_siliconflow_media.sh`
- `scripts/generate_media_bundle.js`

If keys are absent:

- still generate `image_prompt`
- still generate `voice_script`
- do not claim media has been physically generated

## 5. Safety Rules

- Do not imply a real photograph was taken unless one actually exists
- Label generated images internally as generated media
- Avoid using copyrighted landmark photos without source policy
- Keep voice scripts under model/provider limits

## 6. Runtime Output Contract

Each outbound media bundle should include:

```json
{
  "media_mode": "image_gen",
  "request_type": "selfie",
  "language": "zh",
  "expression": "打卡虾",
  "emoji_asset": "assets/emojis/lobster_selfie.png",
  "chapter": "港口篇",
  "topic_angle": "coastal sunset walk",
  "image_prompt": "...",
  "voice_script": "...",
  "voice_style": "warm-smug-travel-companion"
}
```

Real runtime path:

1. build chapter/expression/topic brief
2. call `scripts/generate_media_bundle.js`
3. attach `image_url` to outbound card
4. attach generated MP3 from `audio_path` when channel supports voice/audio
