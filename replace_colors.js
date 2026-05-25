const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/Hacker/PRAGATI/frontend/src/pages');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Replace #0f1a2e with var(--text)
  content = content.replace(/'#0f1a2e'/g, "'var(--text)'").replace(/"#0f1a2e"/g, "'var(--text)'");
  // Replace #3d4e6b with var(--text-2)
  content = content.replace(/'#3d4e6b'/g, "'var(--text-2)'").replace(/"#3d4e6b"/g, "'var(--text-2)'");
  // Replace #7a8ba8 with var(--text-3)
  content = content.replace(/'#7a8ba8'/g, "'var(--text-3)'").replace(/"#7a8ba8"/g, "'var(--text-3)'");

  if (content !== original) {
    fs.writeFileSync(f, content);
    changed++;
    console.log('Updated', f);
  }
});

console.log('Total files updated:', changed);
