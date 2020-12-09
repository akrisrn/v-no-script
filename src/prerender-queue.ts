import { Browser } from 'puppeteer-core';
import { beginTo, loadPage, newPage, writeFile } from '@/prerender-common';

const loadedPaths: string[] = [];

async function loadPages(browser: Browser, paths: string[]) {
  const page = await newPage(browser);
  const queue = [...paths];
  let path = queue.shift();
  while (path) {
    loadedPaths.push(path);
    const { html, paths } = await loadPage(page, path);
    if (html) {
      writeFile(path.replace(/\.md$/, '.html'), html);
      paths.forEach(path => {
        if (!loadedPaths.includes(path) && !queue.includes(path)) {
          queue.push(path);
        }
      });
    } else {
      console.error('error:', path);
    }
    path = queue.shift();
  }
  await page.close();
}

(async () => await beginTo(loadPages))();
