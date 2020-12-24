import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import watch from 'node-watch';
import { checkSitePath, getRelative } from '@/utils';
import { commonFile, homePath, indexPath, localhost, port, publicPath, sitePath } from '@/utils/vars';

checkSitePath();

const absoluteIndexPath = path.join(sitePath, indexPath);
const clientCodePath = path.join(__dirname, 'ws-client.js');

function getIndexData() {
  const indexData = fs.readFileSync(absoluteIndexPath).toString();
  const clientCode = fs.readFileSync(clientCodePath).toString()
    .replace(/(ws:\/\/localhost:)3000/, `$1${port}`)
    .replace(/'\/common\.md'/, commonFile ? `'${commonFile}'` : '');
  return indexData.replace(/(<\/body>)/, `<script>${clientCode}</script>$1`);
}

let indexData = getIndexData();

const app = express();
app.get(homePath, (request, response) => response.send(indexData));
app.use(publicPath, express.static(sitePath));

const server = http.createServer(app);
server.listen(port, 'localhost', () => {
  console.log(`Listening at ${localhost}${homePath}`);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', () => {
  console.log(`Connected clients: ${wss.clients.size}`);
});

function broadcast(data: string) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

enum EventType {
  refresh,
  reload
}

function createResponse(type: EventType, data: any = null) {
  return JSON.stringify({ type, data });
}

watch([absoluteIndexPath, clientCodePath], () => {
  indexData = getIndexData();
  broadcast(createResponse(EventType.refresh));
});

watch(sitePath, {
  recursive: true,
  filter: (file, skip) => {
    if (/\.git/.test(file)) {
      return skip;
    }
    return /\.md$/.test(file);
  },
}, (eventType, filePath) => {
  if (filePath) {
    broadcast(createResponse(EventType.reload, `/${getRelative(filePath)}`));
  }
});
