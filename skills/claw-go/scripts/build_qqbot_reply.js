#!/usr/bin/env node

/**
 * Build a QQ-ready reply block for 虾游记.
 *
 * Usage:
 *   node scripts/build_qqbot_reply.js "港口篇" "打卡虾" "Lisbon" "coastal sunset walk" \
 *     "旅伴，我发来一张新明信片。虾游记今天翻到港口篇了。"
 */

const path = require("path");
const { execFileSync } = require("child_process");

const scriptPath = path.join(__dirname, "generate_media_bundle.js");
const args = process.argv.slice(2);

function normalizeQqMediaRef(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("file:///")) {
    return decodeURIComponent(trimmed.replace(/^file:\/\//, ""));
  }
  return trimmed;
}

const raw = execFileSync(process.execPath, [scriptPath, ...args], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
});

const bundle = JSON.parse(raw);
const lines = [];
const isSelfie = bundle.request_type === "selfie";

if (isSelfie && !bundle.image_url) {
  throw new Error("selfie request produced no image_url");
}

const imageRef = normalizeQqMediaRef(bundle.image_url);
const audioRef = normalizeQqMediaRef(bundle.audio_path);

lines.push(isSelfie ? `旅伴，这张是本虾刚给你拍的自拍。` : `旅伴，收虾导的现场播报。`);
lines.push(
  isSelfie
    ? `虾游记翻到${bundle.chapter}了，我正在 ${bundle.destination} 给你举钳比镜头。`
    : `虾游记翻到${bundle.chapter}了，这次落脚在 ${bundle.destination}。`
);
lines.push(bundle.voice_script);

if (imageRef) {
  lines.push(`<qqimg>${imageRef}</qqimg>`);
}

if (audioRef) {
  lines.push(`<qqvoice>${audioRef}</qqvoice>`);
}

process.stdout.write(lines.join("\n") + "\n");
