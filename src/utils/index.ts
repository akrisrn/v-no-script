import fs from 'fs';
import path from 'path';
import { excludeDirs, sitePath } from '@/utils/vars';

export function checkSitePath() {
  if (!sitePath) {
    console.error('error:', 'process.env.SITE_PATH is empty');
    process.exit(1);
  }
}

export function getRelative(filePath: string) {
  return path.relative(sitePath, filePath).replace(/\\/g, '/');
}

export async function* getFiles(dirPath: string): AsyncGenerator<string> {
  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const direntPath = path.join(dirPath, dirent.name);
    if (!dirent.isDirectory()) {
      yield direntPath;
    } else if (!excludeDirs.includes(dirent.name)) {
      yield* getFiles(direntPath);
    }
  }
}
