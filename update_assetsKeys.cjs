const fs = require('fs');
const path = require('path');

function toSnakeCase(str) {
  if (str === '.DS_Store' || str === '.gitignore') return str;
  
  const extIndex = str.lastIndexOf('.');
  let name = extIndex > 0 ? str.slice(0, extIndex) : str;
  const ext = extIndex > 0 ? str.slice(extIndex).toLowerCase() : '';
  
  // Handle camelCase, PascalCase, spaces, and hyphens
  name = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_') // remove consecutive underscores
    .toLowerCase();
    
  return name + ext;
}

function processPath(p) {
  return p.split('/').map(part => toSnakeCase(part)).join('/');
}

const assetsKeysPath = path.join(__dirname, 'src/constants/assetsKeys.ts');
let content = fs.readFileSync(assetsKeysPath, 'utf8');

// Replace path, textureURL, atlasURL
content = content.replace(/(path|textureURL|atlasURL):\s*'([^']+)'/g, (match, prop, val) => {
  return `${prop}: '${processPath(val)}'`;
});

// Replace key
content = content.replace(/key:\s*'([^']+)'/g, (match, val) => {
  return `key: '${toSnakeCase(val)}'`;
});

fs.writeFileSync(assetsKeysPath, content);
console.log('Updated assetsKeys.ts');
