import 'webextension-polyfill';
console.log('background loaded');

chrome.runtime.onMessage.addListener((message: Record<string, string>) => {
  const { event, data, host, pathname } = message;
  if (event === '___NEXT_OBJECT_EVENT_KEY') {
    console.log('(background.js) NextJS 13+ Bundled Data Observer', host, pathname);
    chrome.storage.local.set({
      [host]: {
        data,
        pathname,
        isParsed: false,
      },
    });
  }
});
