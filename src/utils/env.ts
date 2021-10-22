import dotenv from 'dotenv';
import { ASSETS_DIR, PURE_WRITER } from '@/utils/const';

dotenv.config();

function getNum(value: string | undefined, defaultValue: number) {
  if (!value) {
    return defaultValue;
  }
  const num = parseInt(value);
  return isNaN(num) ? defaultValue : num;
}

function getList(value?: string) {
  return value?.split(',').map(item => item.trim()).filter(item => item) ?? [];
}

const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;

function escapeRE(str: string) {
  return str.replace(REGEXP_ESCAPE_RE, '\\$&');
}

export const SITE_PATH = process.env.SITE_PATH || '';
export const OUT_DIR = process.env.OUT_DIR || SITE_PATH || 'out';
export const PORT = getNum(process.env.PORT, 3000);
export const HOST = process.env.HOST || `http://localhost${PORT !== 80 ? `:${PORT}` : ''}`;
export const PUBLIC_PATH = process.env.PUBLIC_PATH || '/';
export const INDEX_PATH = process.env.INDEX_PATH || 'index.html';
export const CDN_URL = process.env.CDN_URL || '';
export const INDEX_FILE = process.env.INDEX_FILE || '/index.md';
export const COMMON_FILE = process.env.COMMON_FILE || '/common.md';
export const EXCLUDE_DIRS = getList(process.env.EXCLUDE_DIRS).map(escapeRE);
export const EXCLUDE_USERNAME = getList(process.env.EXCLUDE_USERNAME);
export const ADD_DEPLOY_TIME = !!process.env.ADD_DEPLOY_TIME;
export const USE_TIMESTAMP = !!process.env.USE_TIMESTAMP;
export const ONLY_IN_GIT = !!process.env.ONLY_IN_GIT;
export const DISABLE_WS = !!process.env.DISABLE_WS;
export const PW_BACKUPS_PATH = process.env.PW_BACKUPS_PATH || '';
export const PW_DIR = process.env.PW_DIR || PURE_WRITER;
export const PW_TAG = process.env.PW_TAG || PURE_WRITER;
export const PW_DELAY = getNum(process.env.PW_DELAY, 1000 * 60);

['\\.git', 'node_modules', ASSETS_DIR].forEach(item => EXCLUDE_DIRS.push(item));
