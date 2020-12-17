import fs from 'fs';
import path from 'path';
import crypto, { BinaryLike } from 'crypto';
import { checkSitePath, getFiles } from '@/utils';
import {
  cacheKeyPath,
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
  return new RegExp(`(<script\\s+src=["']${src}).*?(["']>)`);
}

const digestDict: { [index: string]: string } = {};

(async () => {
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
  const cacheKeyDigest = getDigest(cacheKeyData);
  fs.writeFileSync(path.join(sitePath, cacheKeyPath), cacheKeyData);

  const absoluteIndexPath = path.join(sitePath, indexPath);
  let indexData = fs.readFileSync(absoluteIndexPath).toString();
  const configDigest = getDigest(fs.readFileSync(path.join(sitePath, configPath)));
  const configRegExp = getScriptRegExp(publicConfigPath);
  indexData = indexData.replace(configRegExp, `$1?${configDigest}$2`);
  const cacheKeyRegExp = getScriptRegExp(publicCacheKeyPath);
  if (cacheKeyRegExp.test(indexData)) {
    indexData = indexData.replace(cacheKeyRegExp, `$1?${cacheKeyDigest}$2`);
  } else {
    const index = indexData.match(configRegExp)!.index!;
    const partA = indexData.substring(0, index);
    const partB = indexData.substring(index);
    indexData = `${partA}<script src="${publicCacheKeyPath}?${cacheKeyDigest}"></script>${partB}`;
  }
  fs.writeFileSync(absoluteIndexPath, indexData);
})();
