import path from 'path';
import fs from 'fs';
import puppeteer, { Browser, Page, Request } from 'puppeteer-core';
import {
  assetsPath,
  cdnAssetsUrl,
  cdnUrl,
  homePath,
  host,
  indexFile,
  indexUrl,
  outDir,
  publicPath,
} from '@/utils/vars';

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

function checkRequest(request: Request) {
  const resourceType = request.resourceType();
  if (['document', 'xhr'].includes(resourceType)) {
    return true;
  }
  if (!['script', 'stylesheet'].includes(resourceType)) {
    return false;
  }
  const urlStr = request.url();
  if (cdnUrl) {
    return urlStr.startsWith(cdnAssetsUrl);
  }
  const url = new URL(urlStr);
  return url.origin === host && url.pathname.startsWith(assetsPath);
}

export async function newPage(browser: Browser) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (checkRequest(request)) {
      request.continue();
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
    if (document.querySelector('main.error')) {
      return { html, paths };
    }
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]').forEach(a => {
      let path = a.getAttribute('href')!.substr(1);
      let anchor = '';
      let query = '';
      let indexOf = path.indexOf('?');
      if (indexOf >= 0) {
        query = path.substr(indexOf);
        path = path.substr(0, indexOf);
      }
      indexOf = path.indexOf('#');
      if (indexOf >= 0) {
        anchor = path.substr(indexOf);
        path = path.substr(0, indexOf);
      }
      if (path.endsWith('/')) {
        path += 'index.md';
      }
      if (path.endsWith('.md')) {
        a.href = publicPath + path.replace(/\.md$/, '.html').substr(1) + anchor + query;
        paths.push(path);
      }
    });
    if (homePath !== publicPath) {
      document.querySelectorAll<HTMLAnchorElement>(`a[href="${homePath}"]`).forEach(a => {
        a.href = publicPath;
      });
    }
    document.querySelectorAll([
      'a > svg',
      '#top > div > select',
      '#backlinks > .icon',
      '.heading-tag',
      '.heading-link',
      '.sync',
      '.custom',
      '#ws-client',
      '.item-ws-status',
    ].join()).forEach(element => element.remove());
    document.querySelectorAll('.lds-ellipsis').forEach(element => {
      const nextElement = element.nextElementSibling!;
      nextElement.classList.remove('hidden');
      if (nextElement.classList.length === 0) {
        nextElement.removeAttribute('class');
      }
      element.remove();
    });
    const cleanDigest = (isScript = true) => {
      const attr = isScript ? 'src' : 'href';
      document.querySelectorAll(isScript ? `script[src]` : `link[href]`).forEach(element => {
        const src = element.getAttribute(attr)!;
        element.setAttribute(attr, src.replace(/\?.*?$/, ''));
      });
    };
    cleanDigest();
    cleanDigest(false);
    document.body.id = 'prerender';
    const documentElement = document.documentElement;
    documentElement.removeAttribute('style');
    // noinspection HtmlRequiredLangAttribute
    html = documentElement.outerHTML
      .replace('<html style="">', '<html>')
      .replaceAll(/<!--.*?-->/g, '')
      .replaceAll(/(>)(?:\r?\n)+(<)/g, '$1$2');
    return { html, paths };
  }, publicPath, homePath);
}

export async function beginTo(loadPages: (browser: Browser, paths: string[]) => Promise<void>) {
  const browser = await puppeteer.launch();
  await loadPages(browser, [indexFile]);
  console.log(count, 'files were written');
  await browser.close();
}
