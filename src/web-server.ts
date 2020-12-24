import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import watch from 'node-watch';
import { checkSitePath, getRelative } from '@/utils';
import {
  commonFile,
  disableWS,
  excludeDirs,
  homePath,
  indexPath,
  localhost,
  port,
  publicPath,
  sitePath,
} from '@/utils/vars';

checkSitePath();

const app = express();
const server = http.createServer(app);

if (!disableWS) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', () => {
    console.log(`Connected clients: ${wss.clients.size}`);
  });

  const broadcast = (data: string) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  const absoluteIndexPath = path.join(sitePath, indexPath);
  const clientCodePath = path.join(__dirname, 'ws-client.js');

  const getIndexData = () => {
    const indexData = fs.readFileSync(absoluteIndexPath).toString();
    const clientCode = fs.readFileSync(clientCodePath).toString()
      .replace(/(ws:\/\/localhost:)3000/, `$1${port}`)
      .replace(/'\/common\.md'/, commonFile ? `'${commonFile}'` : '');
    return indexData.replace(/(<\/body>)/, `<script>${clientCode}</script>$1`);
  };

  let indexData = getIndexData();

  enum EventType {
    refresh,
    reload
  }

  const createResponse = (type: EventType, data: any = null) => JSON.stringify({ type, data });

  watch([absoluteIndexPath, clientCodePath], () => {
    indexData = getIndexData();
    broadcast(createResponse(EventType.refresh));
  });

  const excludeRegExp = new RegExp(`[/\\\\](${excludeDirs.join('|')})[/\\\\]`);

  watch(sitePath, {
    recursive: true,
    filter: (file, skip) => {
      if (excludeRegExp.test(file)) {
        return skip;
      }
      return /\.md$/.test(file);
    },
  }, (eventType, filePath) => {
    if (filePath) {
      broadcast(createResponse(EventType.reload, `/${getRelative(filePath)}`));
    }
  });

  app.get(homePath, (request, response) => response.send(indexData));
}
app.use(publicPath, express.static(sitePath));

server.listen(port, 'localhost', () => {
  console.log(`Listening at ${localhost}${homePath}`);
});
