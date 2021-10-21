import fs from 'fs';
import path from 'path';
import crypto, { BinaryLike } from 'crypto';
import { checkSitePath, getCommits, getFiles, getRelative } from '@/utils';
import { ASSETS_DIR } from '@/utils/const';
import { ADD_DEPLOY_TIME, CDN_URL, INDEX_PATH, ONLY_IN_GIT, PUBLIC_PATH, SITE_PATH, USE_TIMESTAMP } from '@/utils/env';
import { CONFIG_PATH } from '@/utils/path';

checkSitePath();

function getDigest(data: BinaryLike) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex').substr(0, 8);
}

function getScriptRegExp(src: string) {
  return new RegExp(`(<script\\s+src="${src})(?:\\?\\S*?)?("\\s*>)`);
}

function getLinkRegExp(href: string) {
  return new RegExp(`(<link\\s+href="${href})(?:\\?\\S*?)?("\\s+rel="preload"\\s+as="script"\\s*/?>)`);
}

function insertCacheKey(indexData: string, url: string, digest: string,
                        configUrl: string, configDigest: string, isScript: boolean) {
  let cacheKeyRegExp: RegExp;
  let configRegExp: RegExp;
  let htmlTag: string;
  if (isScript) {
    cacheKeyRegExp = getScriptRegExp(url);
    configRegExp = getScriptRegExp(configUrl);
    htmlTag = `<script src="${url}?${digest}"></script>`;
  } else {
    cacheKeyRegExp = getLinkRegExp(url);
    configRegExp = getLinkRegExp(configUrl);
    htmlTag = `<link href="${url}?${digest}" rel="preload" as="script">`;
  }
  indexData = indexData.replace(configRegExp, `$1?${configDigest}$2`);
  if (cacheKeyRegExp.test(indexData)) {
    return indexData.replace(cacheKeyRegExp, `$1?${digest}$2`);
  }
  const index = indexData.match(configRegExp)!.index!;
  return indexData.substring(0, index) + htmlTag + indexData.substring(index);
}

const publicConfigPath = PUBLIC_PATH + CONFIG_PATH;
const cdnConfigUrl = CDN_URL + CONFIG_PATH;

const cacheKeyPath = `${ASSETS_DIR}/cacheKey.js`;
const publicCacheKeyPath = PUBLIC_PATH + cacheKeyPath;
const cdnCacheKeyUrl = CDN_URL + cacheKeyPath;

(async () => {
  const deployTime = new Date().getTime();
  let cacheKeyData = 'cacheKey=';
  if (USE_TIMESTAMP) {
    cacheKeyData += `'t=${deployTime}';`;
  } else {
    const digestDict: { [index: string]: string } = {};
    for await (const filePath of getFiles(SITE_PATH, /\.(md|js|css)$/)) {
      const path = getRelative(filePath);
      if (ONLY_IN_GIT && !getCommits(path, true)) {
        continue;
      }
      digestDict[`/${path}`] = getDigest(fs.readFileSync(filePath));
    }
    cacheKeyData += `${JSON.stringify(digestDict)};`;
  }
  if (ADD_DEPLOY_TIME) {
    cacheKeyData += `deployTime=${deployTime};`;
  }
  fs.writeFileSync(path.join(SITE_PATH, cacheKeyPath), cacheKeyData);

  const absoluteIndexPath = path.join(SITE_PATH, INDEX_PATH);
  let indexData = fs.readFileSync(absoluteIndexPath, {
    encoding: 'utf-8',
  });
  const cacheKeyUrl = CDN_URL ? cdnCacheKeyUrl : publicCacheKeyPath;
  const cacheKeyDigest = getDigest(cacheKeyData);
  const configUrl = CDN_URL ? cdnConfigUrl : publicConfigPath;
  const configDigest = getDigest(fs.readFileSync(path.join(SITE_PATH, CONFIG_PATH)));
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, true);
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, false);
  fs.writeFileSync(absoluteIndexPath, indexData);
})();
