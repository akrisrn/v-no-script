import { sitePath } from '@/vars';

export function checkSitePath() {
  if (!sitePath) {
    console.error('error:', 'process.env.SITE_PATH is empty');
    process.exit(1);
  }
}
