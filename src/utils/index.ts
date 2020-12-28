import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';
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

const excludeRegExp = new RegExp(`^(${excludeDirs.join('|')})$`);

export async function* getFiles(dirPath: string): AsyncGenerator<string> {
  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const direntPath = path.join(dirPath, dirent.name);
    if (!dirent.isDirectory()) {
      yield direntPath;
    } else if (!excludeRegExp.test(dirent.name)) {
      yield* getFiles(direntPath);
    }
  }
}

export function getCommits(filePath: string, onlyOne = false) {
  try {
    const args = ['log', '--format=%an,%ct000,%h'];
    if (onlyOne) {
      args.push('-1');
    }
    args.push(filePath);
    return spawn.sync('git', args, {
      cwd: sitePath,
    }).stdout.toString().trim();
  } catch (e) {
    return '';
  }
}
