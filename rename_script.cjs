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

function walkAndRename(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Depth-first traversal
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndRename(fullPath);
    }
  }
  
  // Rename in current directory
  // Read again because child renames might affect directory paths (though not files inside current dir, but wait: renaming child directories changes their path. However, we only rename children after traversing into them, so their contents are already renamed. Now we just rename the child directory itself.)
  // Actually, `entries` holds the original names of the children. We can just use `fs.renameSync` on them.
  for (const entry of entries) {
    const oldPath = path.join(dir, entry.name);
    const newName = toSnakeCase(entry.name);
    if (newName !== entry.name) {
      const newPath = path.join(dir, newName);
      console.log(`Renaming: ${oldPath} -> ${newPath}`);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (e) {
        console.error(`Error renaming ${oldPath} to ${newPath}`, e);
      }
    }
  }
}

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  walkAndRename(publicDir);
  console.log('Renaming complete.');
} else {
  console.error(`Directory not found: ${publicDir}`);
}
