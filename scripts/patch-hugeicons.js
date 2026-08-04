const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'hugeicons-react-native',
  'dist',
  'esm',
  'create-hugeicon-component.js'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('const t={...s};') && !content.includes('delete t.key;')) {
    content = content.replace('const t={...s};', 'const t={...s};delete t.key;');
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-hugeicons] Successfully patched hugeicons-react-native for React 19 compatibility.');
  }
}
