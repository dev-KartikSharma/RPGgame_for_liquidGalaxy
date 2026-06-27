const fs = require('fs');
const path = require('path');
const p = path.join('C:\\Users\\HP\\Desktop\\RPG Game\\rpg-game-lg\\public\\maps\\spawn.json');
const map = JSON.parse(fs.readFileSync(p, 'utf8'));

// Check if Spawns layer already exists
let spawnsLayer = map.layers.find(l => l.name === 'Spawns');
if (!spawnsLayer) {
    spawnsLayer = {
        "id": 99,
        "name": "Spawns",
        "type": "objectgroup",
        "objects": [],
        "opacity": 1,
        "visible": true,
        "x": 0,
        "y": 0
    };
    map.layers.push(spawnsLayer);
}

// Check if PlayerSpawn already exists
let spawnPoint = spawnsLayer.objects.find(o => o.name === 'PlayerSpawn');
if (!spawnPoint) {
    spawnPoint = {
        "id": 100,
        "name": "PlayerSpawn",
        "type": "PlayerSpawn",
        "point": true,
        "x": 1600,
        "y": 1600
    };
    spawnsLayer.objects.push(spawnPoint);
}

fs.writeFileSync(p, JSON.stringify(map, null, 2));
console.log("Added PlayerSpawn object to spawn.json");
