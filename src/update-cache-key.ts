import fs from 'fs';
import path from 'path';
import crypto, { BinaryLike } from 'crypto';
import { checkSitePath, getCommits, getFiles, getRelative } from '@/utils';
import { assetsDir } from '@/utils/const';
import { addDeployTime, cdnUrl, indexPath, onlyInGit, publicPath, sitePath, useTimestamp } from '@/utils/env';
import { configPath } from '@/utils/path';

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

const publicConfigPath = publicPath + configPath;
const cdnConfigUrl = cdnUrl + configPath;

const cacheKeyPath = `${assetsDir}/cacheKey.js`;
const publicCacheKeyPath = publicPath + cacheKeyPath;
const cdnCacheKeyUrl = cdnUrl + cacheKeyPath;

(async () => {
  const deployTime = new Date().getTime();
  let cacheKeyData = 'cacheKey=';
  if (useTimestamp) {
    cacheKeyData += `'t=${deployTime}';`;
  } else {
    const digestDict: { [index: string]: string } = {};
    for await (const filePath of getFiles(sitePath, /\.(md|js|css)$/)) {
      const path = getRelative(filePath);
      if (onlyInGit && !getCommits(path, true)) {
        continue;
      }
      digestDict[`/${path}`] = getDigest(fs.readFileSync(filePath));
    }
    cacheKeyData += `${JSON.stringify(digestDict)};`;
  }
  if (addDeployTime) {
    cacheKeyData += `deployTime=${deployTime};`;
  }
  fs.writeFileSync(path.join(sitePath, cacheKeyPath), cacheKeyData);

  const absoluteIndexPath = path.join(sitePath, indexPath);
  let indexData = fs.readFileSync(absoluteIndexPath, {
    encoding: 'utf-8',
  });
  const cacheKeyUrl = cdnUrl ? cdnCacheKeyUrl : publicCacheKeyPath;
  const cacheKeyDigest = getDigest(cacheKeyData);
  const configUrl = cdnUrl ? cdnConfigUrl : publicConfigPath;
  const configDigest = getDigest(fs.readFileSync(path.join(sitePath, configPath)));
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, true);
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, false);
  fs.writeFileSync(absoluteIndexPath, indexData);
})();
