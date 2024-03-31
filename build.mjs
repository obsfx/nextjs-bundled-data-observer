import { bundleCss, esbuildCtx, movePublicFiles, removeDistDir } from './build.common.mjs';

(async () => {
  console.log('   Building with esbuild');
  removeDistDir();
  await esbuildCtx.rebuild();
  movePublicFiles();
  await bundleCss();
  console.log('   Build complete');
  process.exit(0);
})();
