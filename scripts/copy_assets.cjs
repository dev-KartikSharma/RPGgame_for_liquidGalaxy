const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/HP/.gemini/antigravity/brain/aa179cbe-b2fe-4ed3-852e-250d8a124b74/.user_uploaded';
const dstDir = path.resolve(__dirname, '../docs/images');

if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir, { recursive: true });
}

const fileMap = {
  'media_1787176856913.png': 'menu.png',
  'media_1787176856828.png': 'gameplay.png',
  'media_1787176856845.png': 'combat.png',
  'media_1787176880356.png': 'hud_closeup.png'
};

for (const [srcFile, dstFile] of Object.entries(fileMap)) {
  const srcPath = path.join(srcDir, srcFile);
  const dstPath = path.join(dstDir, dstFile);
  fs.copyFileSync(srcPath, dstPath);
  const stat = fs.statSync(dstPath);
  console.log(`Copied ${srcFile} -> ${dstFile} (${stat.size} bytes)`);
}
