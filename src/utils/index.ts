import fs from 'fs';
import path from 'path';
import watch from 'node-watch';
import spawn from 'cross-spawn';
import { excludeDirs, sitePath } from '@/utils/env';

export function checkSitePath() {
  if (!sitePath) {
    console.error('error:', 'process.env.SITE_PATH is empty');
    process.exit(1);
  }
}

export function getRelative(filePath: string) {
  return path.relative(sitePath, filePath).replace(/\\/g, '/');
}

export async function* getFiles(dirPath: string, match = /\.md$/,
                                exclude = new RegExp(`^(${excludeDirs.join('|')})$`)): AsyncGenerator<string> {
  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const direntPath = path.join(dirPath, dirent.name);
    if (!dirent.isDirectory()) {
      if (!match) {
        yield direntPath;
      } else if (match.test(dirent.name)) {
        yield direntPath;
      }
    } else if (!exclude) {
      yield* getFiles(direntPath, match, exclude);
    } else if (!exclude.test(dirent.name)) {
      yield* getFiles(direntPath, match, exclude);
    }
  }
}

export function watchDir(dirPath: string, callback: (eventType?: 'update' | 'remove', filePath?: string) => any, recursive = true,
                         match = /\.md$/, exclude = new RegExp(`[/\\\\](${excludeDirs.join('|')})[/\\\\]`)) {
  return watch(dirPath, {
    recursive,
    filter: (file, skip) => {
      if (exclude && exclude.test(file)) {
        return skip;
      }
      return match ? match.test(file) : true;
    },
  }, callback);
}

export function getCommits(filePath: string, onlyOne = false) {
  try {
    const args = ['log', '--follow', '--format=%an,%ct000,%h'];
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
