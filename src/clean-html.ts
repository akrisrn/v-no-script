import fs from 'fs';
import path from 'path';
import { checkSitePath, getFiles } from '@/utils';
import { indexPath, sitePath } from '@/utils/env';

checkSitePath();

const absoluteIndexPath = path.join(sitePath, indexPath);

(async () => {
  for await (const filePath of getFiles(sitePath, /\.html$/)) {
    if (filePath !== absoluteIndexPath) {
      fs.rmSync(filePath);
    }
  }
})();
