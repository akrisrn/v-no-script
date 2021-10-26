import { Browser } from 'puppeteer-core';
import { error } from '@/utils';
import { beginTo, loadPage, newPage, writeFile } from '@/utils/prerender';

const loadedPaths: string[] = [];

async function loadPages(browser: Browser, paths: string[]) {
  const page = await newPage(browser);
  const queue = [...paths];
  let path = queue.shift();
  while (path) {
    loadedPaths.push(path);
    const { html, paths } = await loadPage(page, path);
    if (!html) {
      error(path, 'is error page');
      path = queue.shift();
      continue;
    }
    writeFile(path.replace(/\.md$/, '.html'), html);
    paths.forEach(path => {
      if (!loadedPaths.includes(path) && !queue.includes(path)) {
        queue.push(path);
      }
    });
    path = queue.shift();
  }
  await page.close();
}

(async () => await beginTo(loadPages))();
