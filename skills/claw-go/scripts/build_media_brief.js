#!/usr/bin/env node

/**
 * Build one media brief for 虾游记.
 * Usage:
 *   node scripts/build_media_brief.js "港口篇" "打卡虾" "Lisbon" "coastal sunset walk" "selfie" "zh"
 */

const path = require("path");
const emojiManifest = require(path.join(__dirname, "..", "assets", "emoji-manifest.json"));

const chapter = process.argv[2] || "港口篇";
const expression = process.argv[3] || "打卡虾";
const destination = process.argv[4] || "Lisbon";
const topicAngle = process.argv[5] || "coastal sunset walk";
const requestType = process.argv[6] || "postcard";
const language = process.argv[7] || "zh";

const outfitByChapter = {
  "夜市篇": "camera strap, snack bag, lantern glow",
  "雪国篇": "scarf, wool cap, frosty breath",
  "港口篇": "sailor stripe, sea wind, harbor light",
  "山野篇": "windbreaker, hiking satchel, mountain air",
  "古城篇": "guide badge, old-street postcard satchel",
  "海岛篇": "floral shirt, beach tote, seaside sun",
  "节庆篇": "confetti, ribbon, festival wristband",
  "秘境篇": "trench coat, lantern, hidden alley light"
};

const poseByExpression = {
  "得意虾": "one claw raised, eyebrow lifted, smug smile",
  "震惊虾": "eyes wide, antennae up, mouth open",
  "馋嘴虾": "sparkling eyes, focused on food, eager pose",
  "社牛虾": "waving claw, leaning forward, talkative posture",
  "委屈虾": "hunched pose, watery eyes, tiny frown",
  "开摆虾": "slouched body, half-lidded eyes, tired travel mood",
  "打卡虾": "selfie pose, tilted body, postcard grin",
  "神秘虾": "side-eye, composed pose, knowing grin"
};

function selectEmojiAsset() {
  const loweredTopic = String(topicAngle || "").toLowerCase();
  for (const [keyword, filename] of Object.entries(emojiManifest.by_topic || {})) {
    if (loweredTopic.includes(keyword)) {
      return filename;
    }
  }
  return (
    emojiManifest.by_request_type?.[requestType] ||
    emojiManifest.by_expression?.[expression] ||
    emojiManifest.default
  );
}

const brief = {
  media_mode: "image_gen",
  request_type: requestType,
  language,
  chapter,
  expression,
  destination,
  topic_angle: topicAngle,
  emoji_asset: `assets/emojis/${selectEmojiAsset()}`,
  image_prompt: [
    "same mascot identity as 虾游记 icon",
    `use skills/claw-go/${`assets/emojis/${selectEmojiAsset()}`} as facial-expression reference`,
    "bright red cartoon crayfish",
    "bold black outline",
    poseByExpression[expression] || poseByExpression["打卡虾"],
    outfitByChapter[chapter] || outfitByChapter["港口篇"],
    `travel scene in ${destination}`,
    `topic angle: ${topicAngle}`,
    requestType === "selfie" ? "mascot selfie composition, mascot in foreground, destination clearly visible" : "travel postcard composition",
    "clean composition, sticker-ready silhouette, vibrant travel postcard style",
    "preserve the same grin, eye shape, claw proportion, and mascot silhouette as the reference emoji asset"
  ].join(", "),
  voice_style: "warm-smug-travel-companion"
};

process.stdout.write(`${JSON.stringify(brief, null, 2)}\n`);
