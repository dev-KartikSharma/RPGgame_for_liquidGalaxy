const fs = require('fs');
const path = require('path');
const p = path.join('C:\\Users\\HP\\Desktop\\RPG Game\\rpg-game-lg\\public\\maps\\spawn.json');
const map = JSON.parse(fs.readFileSync(p, 'utf8'));

console.log("Tilesets in spawn.json:");
map.tilesets.forEach(ts => {
    console.log(`- tiledName: '${ts.name}', image: '${ts.image}'`);
});
