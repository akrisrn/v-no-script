import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import sqlite3 from 'sqlite3';
import { open, Statement } from 'sqlite';
import { parse, validate } from 'fast-xml-parser';
import { checkSitePath, error, getFiles, getRelative, log, runGit, watchDir } from '@/utils';
import { PURE_WRITER } from '@/utils/const';
import { PW_BACKUPS_PATH, PW_DELAY, PW_DIR, PW_TAG, SITE_PATH } from '@/utils/env';

checkSitePath();

if (!PW_BACKUPS_PATH) {
  error('process.env.PW_BACKUPS_PATH is empty');
  process.exit(1);
}

interface XMLData {
  mapper: {
    select: {
      id: string
      text: string
    }[]
  };
}

interface PWFolder {
  id: string;
  name: string;
  desc: string | null;
  created: number;
  rank: number;
}

interface PWArticle {
  id: string;
  title: string;
  content: string;
  count: number;
  created: number;
  updated: number;
  rank: number;
}

function getSQLFromXML(filePath: string) {
  log('read', filePath);
  const fileData = fs.readFileSync(filePath, {
    encoding: 'utf-8',
  });
  const valid = validate(fileData);
  if (valid !== true) {
    error('invalid XML file', valid.err);
    return;
  }
  const xmlData: XMLData = parse(fileData, {
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
  });
  const sqlDict: Dict<string> = {};
  xmlData.mapper.select.forEach(select => {
    sqlDict[select.id] = select.text.replaceAll(/\s+/g, ' ');
  });
  return sqlDict;
}

async function getLatestBackup(dirPath: string, match: RegExp) {
  const files = [];
  for await (const filePath of getFiles(dirPath, match)) {
    files.push({
      path: filePath,
      stats: fs.statSync(filePath),
    });
  }
  if (files.length === 0) {
    error('no backup file in', dirPath);
    return;
  }
  if (files.length === 1) {
    return files[0].path;
  }
  return files.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0].path;
}

async function* yieldLatestBackup(dirPath: string, match: RegExp, timeout: number): AsyncGenerator<string> {
  let filePath = await getLatestBackup(dirPath, match);
  if (filePath) {
    yield filePath;
  }
  let isReady = false;
  watchDir(dirPath, (eventType, newFilePath) => {
    if (eventType === 'update' && newFilePath) {
      isReady = true;
      filePath = newFilePath;
      log('update', newFilePath);
    }
  }, false, match);
  while (true) {
    await new Promise(resolve => setTimeout(resolve, timeout));
    if (isReady && filePath) {
      isReady = false;
      yield filePath;
    }
  }
}

async function unzipBackup(filePath: string, outPath: string, match: RegExp) {
  log('unzip', filePath);
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(unzipper.ParseOne(match))
      .pipe(fs.createWriteStream(outPath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

function writeIndex(dirPath: string, data: string, overwrite = true) {
  const indexPath = path.join(dirPath, 'index.md');
  if (overwrite) {
    log('write', indexPath);
    fs.writeFileSync(indexPath, data);
    return indexPath;
  }
  log('append', indexPath);
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, data);
    return indexPath;
  }
  let indexData = fs.readFileSync(indexPath, {
    encoding: 'utf-8',
  });
  if (indexData.endsWith('\n\n') && data.startsWith('\n')) {
    indexData = indexData.substr(0, indexData.length - 1);
  }
  fs.writeFileSync(indexPath, indexData + data);
  return indexPath;
}

function writeFolder(dirPath: string, folder: PWFolder, tag: string) {
  const folderPath = path.join(dirPath, folder.id);
  log('mkdir', folderPath);
  fs.mkdirSync(folderPath, {
    recursive: true,
  });
  const indexData = `# ${folder.name}\n\n@tags: ${tag}\n@updated: ${folder.created}\n\n` +
    `${folder.desc ? `> ${folder.desc}\n\n` : ''}`;
  const indexPath = writeIndex(folderPath, indexData);
  writeIndex(dirPath, `\n## [+](/${getRelative(indexPath)})\n`, false);
  return folderPath;
}

function writeArticle(dirPath: string, article: PWArticle, tag: string) {
  const filePath = path.join(dirPath, `${article.id}.md`);
  log('write', filePath);
  const times = [article.created];
  if (article.updated !== article.created) {
    times.push(article.updated);
  }
  const fileData = `#${article.title ? ` ${article.title}` : ''}\n\n@tags: ${tag}\n` +
    `@updated: ${times.join(', ')}\n@count: ${article.count}\n\n${article.content}`;
  fs.writeFileSync(filePath, fileData);
  writeIndex(dirPath, `- [](/${getRelative(filePath)} "#")\n`, false);
}

async function writeData(dirPath: string, stmts: Statement[]) {
  if (fs.existsSync(dirPath)) {
    log('rmdir', dirPath);
    fs.rmSync(dirPath, {
      recursive: true,
    });
  }
  log('mkdir', dirPath);
  fs.mkdirSync(dirPath, {
    recursive: true,
  });
  writeIndex(dirPath, `# ${PURE_WRITER}\n\n@tags: ${PW_TAG}\n\n`);

  const [folderStmt, categoryStmt, articleStmt] = stmts;
  for (const folder of await folderStmt.all<PWFolder[]>()) {
    const folderTag = `${PW_TAG}/${folder.name}`;
    const folderPath = writeFolder(dirPath, folder, PW_TAG);

    let categoryTag = folderTag;
    let categoryPath = folderPath;

    const categories = await categoryStmt.all<PWFolder[]>({
      '@folderId': folder.id,
    });
    let index = 0;
    let category = categories[index];
    let rank = categories.length !== 0 ? category.rank : Infinity;

    await articleStmt.each<PWArticle>({
      '@folderId': folder.id,
    }, (err, article) => {
      if (article.rank < rank) {
        writeArticle(categoryPath, article, categoryTag);
        return;
      }
      categoryTag = `${folderTag}/${category.name}`;
      categoryPath = writeFolder(folderPath, category, folderTag);
      writeArticle(categoryPath, article, categoryTag);

      category = categories[++index];
      rank = index < categories.length ? category.rank : Infinity;
    });
  }
}

const xmlFilePath = path.join('./', 'pure-writer.xml');
const dbFilePath = path.join('./dist', 'PureWriterBackup.db');
const dirPath = path.join(SITE_PATH, PW_DIR);

(async () => {
  const sqlDict = getSQLFromXML(xmlFilePath);
  if (!sqlDict) {
    return;
  }
  const sqlList = [];
  for (const selectId of ['queryFolder', 'queryCategory', 'queryArticle']) {
    const sql = sqlDict[selectId];
    if (!sql) {
      error(`no ${selectId} SQL statement`);
      return;
    }
    sqlList.push(sql);
  }

  for await (const filePath of yieldLatestBackup(PW_BACKUPS_PATH, /\.pwb$/, PW_DELAY)) {
    await unzipBackup(filePath, dbFilePath, /\.db$/);
    log('[db]', 'open', dbFilePath);
    const db = await open({
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
      filename: dbFilePath,
    });
    db.on('trace', (data: string) => log('[db]', data));
    const stmts = await Promise.all(sqlList.map(sql => db.prepare(sql)));
    await writeData(dirPath, stmts);
    log('[db]', 'close', dbFilePath);
    await Promise.all(stmts.map(stmt => stmt.finalize()));
    await db.close();

    [
      ['add', '-A', '--ignore-errors', PW_DIR],
      ['commit', '-m', `update ${PW_DIR} from ${getRelative(filePath, PW_BACKUPS_PATH)}`],
    ].forEach(args => {
      log('[git]', ...args);
      try {
        const err = runGit(args).err;
        if (err) {
          error(err);
        }
      } catch (err) {
        error(err);
      }
    });
  }
})();
