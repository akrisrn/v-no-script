import dotenv from 'dotenv';

dotenv.config();

export const sitePath = process.env.SITE_PATH;
export const outDir = process.env.OUT_DIR || sitePath || 'out';
export const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const localhost = `http://localhost${port !== 80 ? `:${port}` : ''}`;
export const host = process.env.HOST || localhost;
export const publicPath = process.env.PUBLIC_PATH || '/';
const indexPath = process.env.INDEX_PATH || '-/index.html';
export const indexFile = process.env.INDEX_FILE || '/index.md';

let shortIndexPath = indexPath;
if (indexPath === 'index.html') {
  shortIndexPath = '';
} else if (indexPath.endsWith('/index.html')) {
  shortIndexPath = indexPath.replace(/index\.html$/, '');
}

export const homePath = publicPath + shortIndexPath;
export const indexUrl = host + homePath;
export const assetsPath = `${publicPath}assets/`;
