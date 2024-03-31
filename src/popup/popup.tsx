import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';
import { Github, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { extractJson, getCurrentWindowTab, resolveRefOfAnObject } from './utils';

export function Popup() {
  const [extractedJsonObjects, setExtractedJsonObjects] = useState<object[]>([]);
  const [searchText, setSearchText] = useDebounceValue('', 150);
  const [searchPending, setSearchPending] = useState(false);
  const [needsRefreshPage, setNeedsRefreshPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getNextObject = async () => {
      const currentTab = await getCurrentWindowTab();
      const urlObject = new URL(currentTab?.url || '');
      const host = urlObject.host;
      const pathame = urlObject.pathname;
      const result = await chrome.storage.local.get([host]);

      if (!result[host]) {
        setLoading(false);
        return;
      }

      const resultData = result[host]['data'];
      const resultPathname = result[host]['pathname'];

      if (pathame !== resultPathname) {
        setNeedsRefreshPage(true);
        setLoading(false);
        return;
      }

      const resultIsParsed = result[host]['isParsed'];
      if (resultIsParsed) {
        console.log('Data already parsed');
        setExtractedJsonObjects(resultData);
        setLoading(false);
        return;
      }

      const nextObjectPayload = resultData;
      const extractedJsonObjects = extractJson(nextObjectPayload);
      for (let i = 0; i < extractedJsonObjects.length; i++) {
        extractedJsonObjects[i] = resolveRefOfAnObject(nextObjectPayload, extractedJsonObjects[i]);
      }
      setExtractedJsonObjects(extractedJsonObjects);
      setLoading(false);
      chrome.storage.local.set({
        [host]: {
          ...result[host],
          data: extractedJsonObjects,
          isParsed: true,
        },
      });
    };

    getNextObject();
  }, []);

  useEffect(() => {
    setSearchPending(false);
  }, [searchText]);

  const renderList = () => {
    if (!searchText) {
      return extractedJsonObjects.map((json, index) => (
        <div key={index}>
          <JsonView
            value={json}
            style={{
              ...lightTheme,
              fontSize: '10px',
            }}
            collapsed={1}
            enableClipboard={false}
            shortenTextAfterLength={60}
          />
        </div>
      ));
    }

    const filteredList = [];
    for (let i = 0; i < extractedJsonObjects.length; i++) {
      const json = extractedJsonObjects[i];
      if (JSON.stringify(json).includes(searchText)) {
        filteredList.push(
          <div key={i}>
            <JsonView
              value={json}
              style={{
                ...lightTheme,
                fontSize: '10px',
              }}
              collapsed={1}
              enableClipboard={false}
              shortenTextAfterLength={60}
            />
          </div>,
        );
      }
    }

    if (filteredList.length === 0) {
      return <div className="text-center text-gray-300 py-16">No data found.</div>;
    }

    return filteredList;
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="absolute top-0 left-0 right-0 bg-neutral-100 text-neutral-500 p-2 text-center flex items-center justify-center w-full h-full text-base">
          Loading NextJS data
        </div>
      );
    }

    if (needsRefreshPage) {
      return (
        <div className="absolute top-0 left-0 right-0 bg-neutral-100 text-neutral-500 p-2 text-center flex flex-col gap-1 items-center justify-center w-full h-full text-base">
          Please refresh the page to load updated data.
          <button
            onClick={() => {
              // close the popup
              window.close();
              chrome.tabs.reload();
            }}
            className="bg-blue-500 text-white px-2 py-1 rounded-md ml-2 hover:bg-blue-600">
            Refresh
          </button>
        </div>
      );
    }

    if (!loading && extractedJsonObjects.length === 0) {
      return (
        <div className="absolute top-0 left-0 right-0 bg-neutral-100 text-neutral-500 p-2 text-center flex items-center justify-center w-full h-full text-base">
          No data found.
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <div
          className="overflow-y-scroll h-[440px] px-2 py-2"
          style={{
            opacity: searchPending ? 0.5 : 1,
          }}>
          <div className="text-gray-500 text-[10px] leading-none pb-2 flex items-center justify-between">
            Object List{' '}
            <span className="text-gray-400">
              NextJS 13+ Bundled Data Observer
              <a
                target="_blank"
                href="https://github.com/obsfx/nextjs-bundled-data-observer"
                rel="noreferrer"
                className="text-blue-500 hover:underline text-[9px] mx-1">
                github.com/obsfx/nextjs-bundled-data-observer
              </a>
            </span>
          </div>
          {renderList()}
        </div>

        <div className="flex items-center justify-between gap-8 py-2 pl-2 pr-4 relative border-t border-gray-100">
          <div className="flex flex-1 items-center relative border border-stone-200 rounded-md text-gray-400">
            <Search size={14} className="mx-1 absolute" />
            <input
              ref={inputRef}
              type="text"
              defaultValue={searchText}
              onChange={e => {
                setSearchPending(e.target.value ? true : false);
                setSearchText(e.target.value);
              }}
              placeholder="Search"
              className="w-full text-[10px] rounded-md text-gray-400 py-1 px-[24px]"
            />

            {searchText && (
              <button
                className="absolute right-1 "
                onClick={() => {
                  setSearchPending(true);
                  setSearchText('');
                  if (inputRef.current) {
                    inputRef.current.value = '';
                  }
                }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return <div className="relative w-[640px] h-[480px]">{renderBody()}</div>;
}
