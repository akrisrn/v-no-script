import { Browser } from 'puppeteer-core';
import { beginTo, loadPage, newPage, writeFile } from './utils';

const loadedPaths: string[] = [];

async function loadPages(browser: Browser, paths: string[]) {
  const promises = [];
  for (const path of paths) {
    if (loadedPaths.includes(path)) {
      continue;
    }
    loadedPaths.push(path);
    promises.push(newPage(browser).then(async page => {
      const { html, paths } = await loadPage(page, path);
      await page.close();
      if (html) {
        writeFile(path.replace(/\.md$/, '.html'), html);
        await loadPages(browser, paths);
      } else {
        console.error('error:', path);
      }
    }));
  }
  await Promise.all(promises);
}

(async () => await beginTo(loadPages))();
