import fs from 'fs';
import path from 'path';
import watch from 'node-watch';
import spawn from 'cross-spawn';
import { EXCLUDE_DIRS, SITE_PATH } from '@/utils/env';

export function log(message?: any, ...optionalParams: any[]) {
  console.log(`[${new Date().toJSON()}]`, message, ...optionalParams);
}

export function error(message?: any, ...optionalParams: any[]) {
  log('[error]', message, ...optionalParams);
}

export function checkSitePath() {
  if (!SITE_PATH) {
    error('process.env.SITE_PATH is empty');
    process.exit(1);
  }
}

export function getRelative(filePath: string, rootPath = SITE_PATH) {
  return path.relative(rootPath, filePath).replace(/\\/g, '/');
}

export async function* getFiles(dirPath: string, match = /\.md$/,
                                exclude = new RegExp(`^(${EXCLUDE_DIRS.join('|')})$`)): AsyncGenerator<string> {
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
                         match = /\.md$/, exclude = new RegExp(`[/\\\\](${EXCLUDE_DIRS.join('|')})[/\\\\]`)) {
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

export function runGit(args: string[], cwd = SITE_PATH) {
  const returns = spawn.sync('git', args, {
    cwd, encoding: 'utf-8',
  });
  if (returns.error) {
    throw returns.error;
  }
  return {
    out: returns.stdout.trim(),
    err: returns.stderr.trim(),
  };
}

export function getCommits(filePath: string, onlyOne = false) {
  try {
    const args = ['log', '--follow', '--format=%an,%ct000,%h'];
    if (onlyOne) {
      args.push('-1');
    }
    args.push(filePath);
    return runGit(args).out;
  } catch {
    return;
  }
}
