import autoprefixer from 'autoprefixer';
import * as esbuild from 'esbuild';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path, { resolve } from 'path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { fileURLToPath } from 'url';

// to be able to use __dirname and __filename in esm
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = resolve(__dirname);
export const publicDir = resolve(rootDir, 'public');
export const distDir = resolve(rootDir, 'dist');
export const srcDir = resolve(rootDir, 'src');

const isProduction = process.env.NODE_ENV === 'production';

export const removeDistDir = async () => {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
};

export const bundleCss = async () => {
  // compile tailwindcss
  const css = fs.readFileSync(resolve(srcDir, 'popup/index.css'), 'utf8');
  const result = await postcss([tailwindcss, autoprefixer]).process(css, {
    from: resolve(srcDir, 'popup/index.css'),
  });
  fs.writeFileSync(resolve(distDir, 'popup/index.css'), result.css);

  //inject script tag into index.html
  const html = fs.readFileSync(resolve(distDir, 'popup.html'), 'utf8');
  const scriptTag = '<script type="module" src="/popup/index.js"></script>';
  const cssTag = '<link rel="stylesheet" href="/popup/index.css" />';
  const newHtmlWithScript = html.replace('</body>', `${scriptTag}</body>`);
  const newHtmlWithCss = newHtmlWithScript.replace('</head>', `${cssTag}</head>`);
  fs.writeFileSync(resolve(distDir, 'popup.html'), newHtmlWithCss);
};

const esbuildEnv = Object.entries(process.env).reduce((acc, [key, value]) => {
  acc[`process.env.${key}`] = JSON.stringify(value);
  return acc;
}, {});

export const esbuildCtx = await esbuild.context({
  entryPoints: [resolve(srcDir, 'popup/index.tsx')],
  jsx: 'automatic',
  bundle: true,
  minify: true,
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
  outdir: distDir,
  outbase: srcDir,
  platform: 'browser',
  target: ['es2020', 'chrome60', 'edge18', 'firefox60', 'safari11'],
  sourcemap: !isProduction,
  define: esbuildEnv,
});

export const movePublicFiles = async () => {
  fsExtra.copySync(publicDir, distDir);
};
