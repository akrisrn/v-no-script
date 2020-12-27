import fs from 'fs';
import { checkSitePath, getCommits, getFiles, getRelative } from '@/utils';
import { excludeUsername, sitePath } from '@/utils/vars';

checkSitePath();

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
    const commits = getCommits(getRelative(filePath));
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
      let [match0, mark, flag, data, space] = match;
      const index = match.index;
      const flagData = flags[flag];
      if (flagData !== undefined) {
        data = flagData[0];
        if (!flagData[1]) {
          flagData[1] = true;
        }
      }
      newData += fileData.substring(start, index) + [mark, data, space].join('');
      start = index + match0.length;
      match = regexp.exec(fileData);
    }
    let noFlag = false;
    if (start === 0) {
      noFlag = true;
      const match = fileData.match(/^# \s*.+?\r?\n/);
      if (match) {
        newData += match[0];
        start = match[0].length;
      }
    }
    let lastPart = fileData.substring(start);
    const missingFlags = [''];
    if (noFlag) {
      missingFlags.push('');
    }
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
