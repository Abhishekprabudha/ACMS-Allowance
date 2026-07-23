import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const indexPath = join(distDir, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html was not found. Run this script after vite build.');
}

for (const fileName of ['404.html', 'settings.html']) {
  copyFileSync(indexPath, join(distDir, fileName));
  console.log(`Created ${join(distDir, fileName)} from ${indexPath}`);
}
