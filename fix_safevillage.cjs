const fs = require('fs');

function fixMap(filename) {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    // Check if Spawns layer exists
    const hasSpawns = data.layers.some(l => l.name.toLowerCase() === 'spawns');
    if (hasSpawns) {
        console.log(`Spawns layer already exists in ${filename}`);
        return;
    }
    
    console.log(`No Spawns layer found in ${filename}. Finding a safe ground tile...`);
    
    // Find ground layer
    const groundLayer = data.layers.find(l => l.name.toLowerCase() === 'ground1' || l.name.toLowerCase() === 'ground');
    let safeX = data.width * data.tilewidth / 2;
    let safeY = data.height * data.tileheight / 2;
    
    if (groundLayer && groundLayer.data) {
        // Find first non-zero tile
        for (let i = 0; i < groundLayer.data.length; i++) {
            if (groundLayer.data[i] !== 0) {
                const col = i % data.width;
                const row = Math.floor(i / data.width);
                safeX = col * data.tilewidth + (data.tilewidth / 2);
                safeY = row * data.tileheight + (data.tileheight / 2);
                console.log(`Found safe ground tile at index ${i} (col: ${col}, row: ${row}) -> x: ${safeX}, y: ${safeY}`);
                break;
            }
        }
    } else {
        console.log("Could not find ground layer. Using center.");
    }
    
    // Add Spawns layer
    data.layers.push({
        draworder: "topdown",
        id: 999,
        name: "Spawns",
        objects: [
            {
                height: 0,
                id: 1000,
                name: "PlayerSpawn",
                rotation: 0,
                type: "PlayerSpawn",
                visible: true,
                width: 0,
                x: safeX,
                y: safeY
            }
        ],
        opacity: 1,
        type: "objectgroup",
        visible: true,
        x: 0,
        y: 0
    });
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully added Spawns layer to ${filename}!`);
}

fixMap('./public/maps/safevillage.json');
