const fs = require('fs');
const path = require('path');

function toSnakeCase(str) {
  if (str === '.DS_Store' || str === '.gitignore') return str;
  const extIndex = str.lastIndexOf('.');
  let name = extIndex > 0 ? str.slice(0, extIndex) : str;
  const ext = extIndex > 0 ? str.slice(extIndex).toLowerCase() : '';
  name = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  return name + ext;
}

function processPath(p) {
  return p.split('/').map(part => {
    // leave '..' as is
    if (part === '..') return part;
    return toSnakeCase(part);
  }).join('/');
}

const mapsDir = path.join(__dirname, 'public/maps');
const files = fs.readdirSync(mapsDir);

files.forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(mapsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let modified = false;

    if (data.tilesets) {
      data.tilesets.forEach(tileset => {
        if (tileset.image) {
          const newImage = processPath(tileset.image);
          if (newImage !== tileset.image) {
            tileset.image = newImage;
            modified = true;
          }
        }
        if (tileset.tiles) {
          tileset.tiles.forEach(tile => {
            if (tile.image) {
              const newImage = processPath(tile.image);
              if (newImage !== tile.image) {
                tile.image = newImage;
                modified = true;
              }
            }
          });
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated ${file}`);
    }
  }
});
