(() => {
  console.log('(content-inject.js) NextJS 13+ Bundled Data Observer');
  const nextObject = window['__next_f'];
  if (nextObject && Array.isArray(nextObject)) {
    const nextObjectPayload = nextObject.map(e => e[1] || '').join('');
    const urlObject = new URL(window.location.href);
    const host = urlObject.host;
    const pathname = urlObject.pathname;
    console.log(
      '(content-inject.js) NextJS 13+ Bundled Data Observer - sending payload to background.js',
      host,
      pathname,
    );
    window.postMessage({
      type: '___NEXT_OBJECT_EVENT_KEY',
      data: nextObjectPayload,
      host,
      pathname,
    });
  }
})();
