import { ASSETS_DIR } from '@/utils/const';
import { INDEX_PATH, PUBLIC_PATH } from '@/utils/env';

let shortIndexPath = INDEX_PATH;
if (INDEX_PATH === 'index.html') {
  shortIndexPath = '';
} else if (INDEX_PATH.endsWith('/index.html')) {
  shortIndexPath = INDEX_PATH.replace(/index\.html$/, '');
}
export const HOME_PATH = PUBLIC_PATH + shortIndexPath;
export const CONFIG_PATH = `${ASSETS_DIR}/config.js`;
