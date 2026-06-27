const fs = require('fs');
const path = require('path');

const replacements = {
  "'Frame 1'": "'frame_1'",
  "'Frame 2   '": "'frame_2_'",
  "'Trees'": "'trees'",
  "'BigBar_Base'": "'big_bar_base'",
  "'SmallBar_Base'": "'small_bar_base'",
  "'BigBar_Fill'": "'big_bar_fill'",
  "'SmallBar_Fill'": "'small_bar_fill'",
  "'Avatars_01'": "'avatars_01'",
  "'Button_Regular'": "'button_regular'",
  "'Button_Pressed'": "'button_pressed'",
  "'Paper_Bg'": "'paper_bg'",
  "'Icon_01'": "'icon_01'",
  "'Icon_02'": "'icon_02'",
  "'BigRibbons'": "'big_ribbons'",
  "'SpecialPaper'": "'special_paper'",
  "'Icon_09'": "'icon_09'",
  "'WoodTable'": "'wood_table'",
  "'StartScreen'": "'start_screen'"
};

function walkAndReplace(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndReplace(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [oldKey, newKey] of Object.entries(replacements)) {
        // Simple replace using split/join or regex globally
        if (content.includes(oldKey)) {
          content = content.split(oldKey).join(newKey);
          modified = true;
        }
      }
      
      // Also handle double quotes
      for (const [oldKey, newKey] of Object.entries(replacements)) {
        const oq = '"' + oldKey.slice(1, -1) + '"';
        const nq = '"' + newKey.slice(1, -1) + '"';
        if (content.includes(oq)) {
          content = content.split(oq).join(nq);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated references in ${fullPath}`);
      }
    }
  }
}

walkAndReplace(path.join(__dirname, 'src'));
