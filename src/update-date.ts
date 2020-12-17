import fs from 'fs';
import spawn from 'cross-spawn';
import { checkSitePath, getFiles } from '@/utils';
import { excludeUsername, sitePath } from '@/utils/vars';

checkSitePath();

function getCommits(filePath: string) {
  try {
    return spawn.sync('git', ['log', '--format=%cn,%ct000,%h', filePath], {
      cwd: sitePath,
    }).stdout.toString().trim();
  } catch (e) {
    return '';
  }
}

type TFlags<T = [string, boolean]> = {
  updated: T;
  creator: T;
  updater: T;
  commit: T;

  [index: string]: T
}

(async () => {
  for await (const filePath of getFiles(sitePath)) {
    if (!filePath.endsWith('.md')) {
      continue;
    }
    const commits = getCommits(filePath.substr(sitePath.length + 1));
    if (!commits) {
      continue;
    }
    let commitList = commits.split('\n');
    if (excludeUsername.length > 0) {
      commitList = commitList.filter(commit => !excludeUsername.includes(commit.split(',')[0]));
    }
    if (commitList.length === 0) {
      continue;
    }
    const [latestName, latestTime, latestHash] = commitList[0].split(',');
    const flags: TFlags = {
      updated: [latestTime, false],
      creator: [latestName, false],
      updater: [latestName, false],
      commit: [latestHash, false],
    };
    if (commitList.length > 1) {
      const [oldestName, oldestTime] = commitList[commitList.length - 1].split(',');
      if (oldestTime !== latestTime) {
        flags.updated[0] = `${oldestTime}, ${latestTime}`;
      }
      flags.creator[0] = oldestName;
    }
    let fileData = fs.readFileSync(filePath).toString();
    let newData = '';
    let start = 0;
    const regexp = /^(@(\S+?):\s*)(.+?)(\s*)$/gm;
    let match = regexp.exec(fileData);
    while (match) {
      const index = match.index;
      let data = match[3];
      const flagData = flags[match[2]];
      if (flagData !== undefined) {
        data = flagData[0];
        if (!flagData[1]) {
          flagData[1] = true;
        }
      }
      newData += fileData.substring(start, index) + [match[1], data, match[4]].join('');
      start = index + match[0].length;
      match = regexp.exec(fileData);
    }
    let lastPart = fileData.substring(start);
    const missingFlags = [''];
    Object.keys(flags).forEach(flag => {
      const flagData = flags[flag];
      if (!flagData[1]) {
        missingFlags.push(`@${flag}: ${flagData[0]}`);
      }
    });
    if (missingFlags.length > 1) {
      missingFlags.push('');
      missingFlags.push('');
      newData = newData.trimEnd();
      newData += missingFlags.join(`${/\r\n/.test(fileData) ? '\r' : ''}\n`);
      lastPart = lastPart.trimStart();
    }
    newData += lastPart;
    fs.writeFileSync(filePath, newData);
  }
})();
