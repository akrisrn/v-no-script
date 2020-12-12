import express from 'express';
import { checkSitePath } from '@/utils';
import { homePath, localhost, port, publicPath, sitePath } from '@/utils/vars';

checkSitePath();

const app = express();
app.use(publicPath, express.static(sitePath));
app.listen(port, () => {
  console.log(`Listening at ${localhost}${homePath}`);
});
