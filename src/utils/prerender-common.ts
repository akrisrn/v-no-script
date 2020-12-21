import path from 'path';
import fs from 'fs';
import puppeteer, { Browser, Page, Request } from 'puppeteer-core';
import {
  assetsPath,
  cdnAssetsUrl,
  cdnCacheKeyUrl,
  cdnConfigUrl,
  cdnUrl,
  homePath,
  host,
  indexFile,
  indexUrl,
  outDir,
  publicCacheKeyPath,
  publicConfigPath,
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
  return page.evaluate((publicPath: string, homePath: string, configUrl: string, cacheKeyUrl: string) => {
    let html = '';
    const paths: string[] = [];
    if (document.querySelector('main.error')) {
      return { html, paths };
    }
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
    document.querySelectorAll([
      'a > svg',
      '#top > div > select',
      '#backlinks > .icon',
      '.heading-tag',
      '.heading-link',
      '.custom',
    ].join()).forEach(element => element.remove());
    document.querySelectorAll('.lds-ellipsis').forEach(element => {
      const nextElement = element.nextElementSibling!;
      nextElement.classList.remove('hidden');
      if (nextElement.classList.length === 0) {
        nextElement.removeAttribute('class');
      }
      element.remove();
    });
    const cleanDigest = (src: string, isScript: boolean) => {
      const htmlTag = document.querySelector(isScript ? `script[src^="${src}"]` : `link[href^="${src}"]`);
      if (htmlTag) {
        htmlTag.setAttribute(isScript ? 'src' : 'href', src);
      }
    };
    cleanDigest(cacheKeyUrl, false);
    cleanDigest(configUrl, false);
    cleanDigest(cacheKeyUrl, true);
    cleanDigest(configUrl, true);
    document.body.id = 'prerender';
    const documentElement = document.documentElement;
    documentElement.removeAttribute('style');
    // noinspection HtmlRequiredLangAttribute
    html = documentElement.outerHTML.replace('<html style="">', '<html>');
    html = html.replaceAll('<!---->', '').replaceAll(/(>)(?:\r?\n)+(<)/g, '$1$2');
    return { html, paths };
  }, publicPath, homePath, ...(cdnUrl ? [cdnConfigUrl, cdnCacheKeyUrl] : [publicConfigPath, publicCacheKeyPath]));
}

export async function beginTo(loadPages: (browser: Browser, paths: string[]) => Promise<void>) {
  const browser = await puppeteer.launch();
  await loadPages(browser, [indexFile]);
  console.log(count, 'files were written');
  await browser.close();
}
