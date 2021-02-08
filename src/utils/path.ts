import { assetsDir, cacheKeyPath, configPath } from '@/utils/const';
import { cdnUrl, host, indexPath, publicPath } from '@/utils/env';

let shortIndexPath = indexPath;
if (indexPath === 'index.html') {
  shortIndexPath = '';
} else if (indexPath.endsWith('/index.html')) {
  shortIndexPath = indexPath.replace(/index\.html$/, '');
}

export const homePath = publicPath + shortIndexPath;
export const indexUrl = host + homePath;

export const assetsPath = `${publicPath}${assetsDir}/`;
export const cdnAssetsUrl = `${cdnUrl}${assetsDir}/`;

export const publicConfigPath = publicPath + configPath;
export const cdnConfigUrl = cdnUrl + configPath;

export const publicCacheKeyPath = publicPath + cacheKeyPath;
export const cdnCacheKeyUrl = cdnUrl + cacheKeyPath;
