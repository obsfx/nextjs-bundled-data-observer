import fs from 'fs';
import http from 'http';
import { resolve } from 'path';
import Watcher from 'watcher';

import { bundleCss, distDir, esbuildCtx, movePublicFiles, removeDistDir, srcDir } from './build.common.mjs';

const host = '127.0.0.1';
const port = 7777;

(async () => {
  let clients = [];
  const requestListener = function (req, res) {
    if (req.url !== '/hot-reload') {
      res.writeHead(200);
      res.end('This http server is running in watch mode. It will only respond to requests to /hot-reload');
    }

    // set headers to allow cors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.writeHead(200);

    const data = `data: ${JSON.stringify({ message: 'initialized' })}\n\n`;
    res.write(data);

    const clientId = Date.now();
    clients.push({ id: clientId, res });

    req.on('close', () => {
      clients = clients.filter(client => client.id !== clientId);
    });
  };

  function sendToAllClients(message) {
    for (let i = 0; i < clients.length; i++) {
      clients[i].res.write(message);
    }
  }

  function injectEventSourceHotReloadScript() {
    const eventSourceScript = `
      if (!window.__hotReloadEventSource) {
        new EventSource('http://${host}:${port}/hot-reload')
        .addEventListener('message', function(event) {
          const data = JSON.parse(event.data);
          if (data.message === 'reload') {
            console.log('🔥 Hot reload');
            window.location.reload();
          }

          if (data.message === 'initialized') {
            console.log('🔥 Hot reload event source initialized');
          }
        });
        window.__hotReloadEventSource = true;
      }`;
    fs.writeFileSync(resolve(distDir, 'hot-reload-script.js'), eventSourceScript);
    const html = fs.readFileSync(resolve(distDir, 'popup.html'), 'utf8');
    const newHtml = html.replace('</body>', `<script src="/hot-reload-script.js"></script></body>`);
    fs.writeFileSync(resolve(distDir, 'popup.html'), newHtml);
  }

  const server = http.createServer(requestListener);
  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });

  console.log('   Building with esbuild [WATCH]');
  removeDistDir();
  await esbuildCtx.rebuild();
  movePublicFiles();
  await bundleCss();
  injectEventSourceHotReloadScript();

  const watcher = new Watcher(srcDir, {
    recursive: true,
    debounce: 500,
  });

  console.log('👀 Watching for file changes');
  watcher.on('change', async file => {
    const now = new Date();
    console.log(`   File ${file} changed`);
    try {
      await esbuildCtx.rebuild();
      movePublicFiles();
      await bundleCss();
      injectEventSourceHotReloadScript();
      sendToAllClients(`data: ${JSON.stringify({ message: 'reload' })}\n\n`);
      const elapsedTime = new Date() - now;
      console.log('   Rebuilt in', elapsedTime, 'ms');
    } catch (err) {
      console.error(err);
    }
  });
})();
