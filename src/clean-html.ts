import fs from 'fs';
import path from 'path';
import { checkSitePath, getFiles } from '@/utils';
import { INDEX_PATH, SITE_PATH } from '@/utils/env';

checkSitePath();

const absoluteIndexPath = path.join(SITE_PATH, INDEX_PATH);

(async () => {
  for await (const filePath of getFiles(SITE_PATH, /\.html$/)) {
    if (filePath !== absoluteIndexPath) {
      fs.rmSync(filePath);
    }
  }
})();
