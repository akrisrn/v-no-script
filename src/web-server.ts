import express from 'express';
import { homePath, port, publicPath, sitePath } from './vars';

if (!sitePath) {
  console.error('error:', 'process.env.SITE_PATH is empty');
  process.exit(1);
}

const app = express();
app.use(publicPath, express.static(sitePath));
app.listen(port, () => {
  console.log(`Listening at http://localhost${port !== 80 ? `:${port}` : ''}${homePath}`);
});
