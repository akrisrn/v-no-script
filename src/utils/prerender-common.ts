import path from 'path';
import fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { assetsPath, homePath, host, indexFile, indexUrl, outDir, publicPath } from '@/utils/vars';

let count = 0;

export function writeFile(filePath: string, html: string) {
  filePath = path.join(outDir, filePath);
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, {
      recursive: true,
    });
  }
  console.log('write:', filePath);
  fs.writeFileSync(filePath, `<!DOCTYPE html>${html}`);
  count++;
}

export async function newPage(browser: Browser) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => {
    const resourceType = request.resourceType();
    if (['document', 'xhr'].includes(resourceType)) {
      request.continue();
    } else if (['script', 'stylesheet'].includes(resourceType)) {
      const url = new URL(request.url());
      if (url.origin === host && url.pathname.startsWith(assetsPath)) {
        request.continue();
      } else {
        request.abort();
      }
    } else {
      request.abort();
    }
  });
  return page;
}

export async function loadPage(page: Page, path: string) {
  const url = `${indexUrl}#${path}`;
  console.log('load:', url);
  await page.goto(url);
  await page.waitForSelector('main:not(.slide-fade-enter-active)');
  await page.waitForSelector('article');
  await page.waitForSelector('.rendering', {
    hidden: true,
  });
  return page.evaluate((publicPath: string, homePath: string) => {
    let html = '';
    const paths: string[] = [];
    if (!document.querySelector('main.error')) {
      document.querySelectorAll<HTMLLinkElement>('a[href^="#/"]').forEach(a => {
        let href = a.getAttribute('href')!;
        const indexOf = href.indexOf('?');
        let query = '';
        if (indexOf >= 0) {
          query = href.substr(indexOf);
          href = href.substr(0, indexOf);
        }
        let path = href.substr(1);
        if (path.endsWith('/')) {
          path += 'index.md';
        }
        a.href = publicPath + path.replace(/\.md$/, '.html').substr(1) + query;
        paths.push(path);
      });
      if (homePath !== publicPath) {
        document.querySelectorAll<HTMLLinkElement>(`a[href="${homePath}"]`).forEach(a => {
          a.href = publicPath;
        });
      }
      document.body.id = 'prerender';
      html = document.documentElement.outerHTML;
    }
    return { html, paths };
  }, publicPath, homePath);
}

export async function beginTo(loadPages: (browser: Browser, paths: string[]) => Promise<void>) {
  const browser = await puppeteer.launch();
  await loadPages(browser, [indexFile]);
  console.log(count, 'files were written');
  await browser.close();
}
