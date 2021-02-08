import dotenv from 'dotenv';
import { assetsDir } from '@/utils/const';

dotenv.config();

function getList(value?: string) {
  return value?.split(',').map(item => item.trim()).filter(item => item) ?? [];
}

const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;

function escapeRE(str: string) {
  return str.replace(REGEXP_ESCAPE_RE, '\\$&');
}

export const sitePath = process.env.SITE_PATH || '';
export const outDir = process.env.OUT_DIR || sitePath || 'out';
export const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const localhost = `http://localhost${port !== 80 ? `:${port}` : ''}`;
export const host = process.env.HOST || localhost;
export const publicPath = process.env.PUBLIC_PATH || '/';
export const indexPath = process.env.INDEX_PATH || '-/index.html';
export const cdnUrl = process.env.CDN_URL || '';
export const indexFile = process.env.INDEX_FILE || '/index.md';
export const commonFile = process.env.COMMON_FILE || '/common.md';
export const excludeDirs = getList(process.env.EXCLUDE_DIRS).map(escapeRE);
export const excludeUsername = getList(process.env.EXCLUDE_USERNAME);
export const addDeployTime = !!process.env.ADD_DEPLOY_TIME;
export const useTimestamp = !!process.env.USE_TIMESTAMP;
export const onlyInGit = !!process.env.ONLY_IN_GIT;
export const disableWS = !!process.env.DISABLE_WS;

['\\.git', 'node_modules', assetsDir].forEach(item => excludeDirs.push(item));
