import fs from 'fs';
import path from 'path';
import { checkSitePath } from '@/utils';
import { assetsDir, indexPath, sitePath } from '@/utils/vars';

checkSitePath();

const excludeDirs = ['.git', '.github', assetsDir];

const getFiles = async function* (dirPath: string): AsyncGenerator<string> {
  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const direntPath = path.join(dirPath, dirent.name);
    if (!dirent.isDirectory()) {
      yield direntPath;
    } else if (!excludeDirs.includes(dirent.name)) {
      yield* getFiles(direntPath);
    }
  }
};

const absoluteIndexPath = path.join(sitePath, indexPath);

(async () => {
  for await (const filePath of getFiles(sitePath)) {
    if (filePath.endsWith('.html') && filePath !== absoluteIndexPath) {
      fs.rmSync(filePath);
    }
  }
})();
