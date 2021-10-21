import os from 'os';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import watch from 'node-watch';
import { checkSitePath, getRelative, log, watchDir } from '@/utils';
import { COMMON_FILE, DISABLE_WS, INDEX_PATH, LOCALHOST, PORT, PUBLIC_PATH, SITE_PATH } from '@/utils/env';
import { CONFIG_PATH, HOME_PATH } from '@/utils/path';

checkSitePath();

const app = express();
const server = http.createServer(app);

if (!DISABLE_WS) {
  const wss = new WebSocket.Server({ server });

  const broadcast = (data: string) => {
    log('broadcast', data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  let lanIp = '';
  const interfaces = os.networkInterfaces();
  for (const key of Object.keys(interfaces)) {
    for (const net of interfaces[key] || []) {
      if (!net.internal && net.family === 'IPv4') {
        lanIp = net.address;
        break;
      }
    }
  }

  const absoluteIndexPath = path.join(SITE_PATH, INDEX_PATH);
  const clientCodePath = path.join(__dirname, 'ws-client.js');

  const getIndexData = () => {
    const indexData = fs.readFileSync(absoluteIndexPath, {
      encoding: 'utf-8',
    });
    const clientCode = fs.readFileSync(clientCodePath, {
      encoding: 'utf-8',
    }).replace(/ws:\/\/(localhost):3000/, `ws://${lanIp || '$1'}:${PORT}`)
      .replace(/'\/common\.md'/, COMMON_FILE ? `'${COMMON_FILE}'` : '');
    return indexData.replace(/(<\/body>)/, `<script id="ws-client">${clientCode}</script>$1`);
  };

  let indexData = getIndexData();

  enum EventType {
    refresh,
    reload
  }

  const createResponse = (type: EventType, data: string | null = null) => JSON.stringify({ type, data });

  watch([
    absoluteIndexPath,
    clientCodePath,
    path.join(SITE_PATH, CONFIG_PATH),
  ], (eventType, filePath) => {
    if (filePath) {
      if (getRelative(filePath) !== CONFIG_PATH) {
        indexData = getIndexData();
      }
      broadcast(createResponse(EventType.refresh));
    }
  });

  watchDir(SITE_PATH, (eventType, filePath) => {
    if (filePath) {
      broadcast(createResponse(EventType.reload, `/${getRelative(filePath)}`));
    }
  });

  app.get(HOME_PATH, (request, response) => {
    log(`access ${HOME_PATH}`);
    response.send(indexData);
  });
}
app.use(PUBLIC_PATH, express.static(SITE_PATH));

server.listen(PORT, () => {
  log(`listening at ${LOCALHOST}${HOME_PATH}${(!DISABLE_WS ? ' and WebSocket enabled' : '')}`);
});
