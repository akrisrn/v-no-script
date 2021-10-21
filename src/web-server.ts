import os from 'os';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import watch from 'node-watch';
import { checkSitePath, getRelative, log, watchDir } from '@/utils';
import { commonFile, disableWS, indexPath, localhost, port, publicPath, sitePath } from '@/utils/env';
import { configPath, homePath } from '@/utils/path';

checkSitePath();

const app = express();
const server = http.createServer(app);

if (!disableWS) {
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

  const absoluteIndexPath = path.join(sitePath, indexPath);
  const clientCodePath = path.join(__dirname, 'ws-client.js');

  const getIndexData = () => {
    const indexData = fs.readFileSync(absoluteIndexPath, {
      encoding: 'utf-8',
    });
    const clientCode = fs.readFileSync(clientCodePath, {
      encoding: 'utf-8',
    }).replace(/ws:\/\/(localhost):3000/, `ws://${lanIp || '$1'}:${port}`)
      .replace(/'\/common\.md'/, commonFile ? `'${commonFile}'` : '');
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
    path.join(sitePath, configPath),
  ], (eventType, filePath) => {
    if (filePath) {
      if (getRelative(filePath) !== configPath) {
        indexData = getIndexData();
      }
      broadcast(createResponse(EventType.refresh));
    }
  });

  watchDir(sitePath, (eventType, filePath) => {
    if (filePath) {
      broadcast(createResponse(EventType.reload, `/${getRelative(filePath)}`));
    }
  });

  app.get(homePath, (request, response) => {
    log(`access ${homePath}`);
    response.send(indexData);
  });
}
app.use(publicPath, express.static(sitePath));

server.listen(port, () => {
  log(`listening at ${localhost}${homePath}${(!disableWS ? ' and WebSocket enabled' : '')}`);
});
