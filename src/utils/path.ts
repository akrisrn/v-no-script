import { assetsDir } from '@/utils/const';
import { indexPath, publicPath } from '@/utils/env';

let shortIndexPath = indexPath;
if (indexPath === 'index.html') {
  shortIndexPath = '';
} else if (indexPath.endsWith('/index.html')) {
  shortIndexPath = indexPath.replace(/index\.html$/, '');
}
export const homePath = publicPath + shortIndexPath;
export const configPath = `${assetsDir}/config.js`;
