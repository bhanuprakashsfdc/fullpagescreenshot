import { build } from 'esbuild';
import { copyFileSync, cpSync, mkdirSync } from 'fs';

const distDir = 'dist';

async function buildOnce() {
  await build({
    entryPoints: [
      'src/background/service-worker.ts',
      'src/popup/popup.ts',
      'src/content/capture.ts',
      'src/shared/messaging.ts',
      'src/shared/storage.ts',
      'src/shared/types.ts',
      'src/utils/scroll-capture.ts',
      'src/utils/stitch.ts',
      'src/utils/annotate.ts',
      'src/utils/export.ts'
    ],
    bundle: true,
    outdir: distDir,
    format: 'esm',
    platform: 'browser',
    target: 'chrome120',
    external: ['chrome.*'],
    resolveExtensions: ['.ts', '.js'],
    write: true
  });

  copyFileSync('src/manifest.json', `${distDir}/manifest.json`);
  copyFileSync('src/popup/popup.html', `${distDir}/popup/popup.html`);
  copyFileSync('src/popup/popup.css', `${distDir}/popup/popup.css`);
  try { mkdirSync(`${distDir}/_locales/en`, { recursive: true }); } catch {}
  copyFileSync('src/_locales/en/messages.json', `${distDir}/_locales/en/messages.json`);
  cpSync('src/icons', `${distDir}/icons`, { recursive: true });

  console.log('Build complete.');
}

buildOnce();
