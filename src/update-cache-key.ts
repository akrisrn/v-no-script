import fs from 'fs';
import path from 'path';
import crypto, { BinaryLike } from 'crypto';
import { checkSitePath, getFiles } from '@/utils';
import {
  cacheKeyPath,
  cdnCacheKeyUrl,
  cdnConfigUrl,
  cdnUrl,
  configPath,
  indexPath,
  publicCacheKeyPath,
  publicConfigPath,
  sitePath,
  useTimestamp,
} from '@/utils/vars';

checkSitePath();

function getDigest(data: BinaryLike) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex').substr(0, 8);
}

function getScriptRegExp(src: string) {
  return new RegExp(`(<script\\s+src="${src}).*?("\\s*>)`);
}

function getLinkRegExp(href: string) {
  return new RegExp(`(<link\\s+href="${href}).*?("\\s+rel="preload"\\s+as="script"\\s*/?>)`);
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

(async () => {
  const digestDict: { [index: string]: string } = {};
  let cacheKeyData = 'cacheKey = ';
  if (useTimestamp) {
    cacheKeyData += `'t=${new Date().getTime()}';`;
  } else {
    for await (const filePath of getFiles(sitePath)) {
      if (!/\.(md|js|css)$/.test(filePath)) {
        continue;
      }
      const path = filePath.substr(sitePath.length).replace(/\\/g, '/');
      digestDict[path] = getDigest(fs.readFileSync(filePath));
    }
    // [The cost of parsing JSON](https://v8.dev/blog/cost-of-javascript-2019#json)
    cacheKeyData += `JSON.parse('${JSON.stringify(digestDict)}')`;
  }
  fs.writeFileSync(path.join(sitePath, cacheKeyPath), cacheKeyData);

  const absoluteIndexPath = path.join(sitePath, indexPath);
  let indexData = fs.readFileSync(absoluteIndexPath).toString();
  const cacheKeyUrl = cdnUrl ? cdnCacheKeyUrl : publicCacheKeyPath;
  const cacheKeyDigest = getDigest(cacheKeyData);
  const configUrl = cdnUrl ? cdnConfigUrl : publicConfigPath;
  const configDigest = getDigest(fs.readFileSync(path.join(sitePath, configPath)));
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, true);
  indexData = insertCacheKey(indexData, cacheKeyUrl, cacheKeyDigest, configUrl, configDigest, false);
  fs.writeFileSync(absoluteIndexPath, indexData);
})();
