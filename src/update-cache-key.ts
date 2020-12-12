import fs from 'fs';
import path from 'path';
import { checkSitePath } from '@/utils';
import { configPath, indexPath, publicConfigPath, sitePath } from '@/utils/vars';

checkSitePath();

const cacheKey = `v=${new Date().getTime()}`;

const absoluteConfigPath = path.join(sitePath, configPath);
let configData = fs.readFileSync(absoluteConfigPath).toString();
configData = configData.replace(/(\scacheKey:\s*["']).*?(["'])/, `$1${cacheKey}$2`);
fs.writeFileSync(absoluteConfigPath, configData);

const absoluteIndexPath = path.join(sitePath, indexPath);
let indexData = fs.readFileSync(absoluteIndexPath).toString();
indexData = indexData.replace(new RegExp(`(<script\\s+src=["']${publicConfigPath}).*?(["']>)`), `$1?${cacheKey}$2`);
fs.writeFileSync(absoluteIndexPath, indexData);
