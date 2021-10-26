import { Browser } from 'puppeteer-core';
import { error } from '@/utils';
import { beginTo, loadPage, newPage, writeFile } from '@/utils/prerender';

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
      if (!html) {
        error(path, 'is error page');
        return;
      }
      writeFile(path.replace(/\.md$/, '.html'), html);
      await loadPages(browser, paths);
    }));
  }
  await Promise.all(promises);
}

(async () => await beginTo(loadPages))();
