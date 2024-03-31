console.log(`NextJS 13+ Bundled Data Observer: (https://github.com/obsfx/nextjs-bundled-data-observer)`);

const injectScriptURL = chrome.runtime.getURL('../content-inject/index.js');
const body = document.getElementsByTagName('body')[0];
const script = document.createElement('script');
script.setAttribute('type', 'text/javascript');
script.setAttribute('src', injectScriptURL);
body.appendChild(script);

window.addEventListener('message', event => {
  const { type, data, host, pathname } = event.data;
  if (type === '___NEXT_OBJECT_EVENT_KEY') {
    console.log('(content.js) NextJS 13+ Bundled Data Observer', host, pathname);
    chrome.runtime.sendMessage({ event: '___NEXT_OBJECT_EVENT_KEY', data, host, pathname });
  }
});
