#!/usr/bin/env node

/**
 * Minimal helper for building one Claw Go travel update payload.
 * Usage:
 *   node scripts/build_update_payload.js free Kyoto selfie
 */

const tier = process.argv[2] || "free";
const destination = process.argv[3] || "Lisbon";
const eventType = process.argv[4] || "selfie";

const hooks = {
  selfie: "我在地标前举钳自拍，路人以为我在比心。",
  food_discovery: "我发现当地夜市的神秘辣酱，辣到走路都带火花。",
  local_friend: "我认识了一只会指路的海鸥，它收费是一包薯条。",
  mini_mishap: "我钻进纪念品袋里，差点被当作限定玩偶带走。",
  souvenir: "我挑到一张手绘明信片，背面写满今天的奇遇。"
};

const hook = hooks[eventType] || hooks.selfie;
const premium = tier === "pro";

const payload = {
  destination,
  story_hook: hook,
  image_prompt: `cute red crayfish traveler in ${destination}, ${eventType}, cinematic, vibrant`,
  voice_script: `主人，我到${destination}啦。${hook} 你要我继续深挖这条路线吗？`,
  cta: "回复我：下一站想看自然风景还是美食冒险？",
  is_premium_content: premium
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
