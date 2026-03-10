const path = require('path');

function basenameAsset(filePath) {
  return path.basename(String(filePath || ''));
}

function publicEmojiUrl(assetPath) {
  const basename = basenameAsset(assetPath);
  return basename ? `/api/assets/emoji/${basename}` : '';
}

module.exports = {
  basenameAsset,
  publicEmojiUrl
};
