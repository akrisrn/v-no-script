import express from 'express';
import { homePath, localhost, port, publicPath, sitePath } from '@/vars';
import { checkSitePath } from '@/utils';

checkSitePath();

const app = express();
app.use(publicPath, express.static(sitePath));
app.listen(port, () => {
  console.log(`Listening at ${localhost}${homePath}`);
});
