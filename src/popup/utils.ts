export const extractJson = (
  input: string,
  startIndex: number = 0,
  terminateOnFirstObject: boolean = false,
): object[] => {
  let i = startIndex;
  let openCurlyBraceCount = 0;
  let stringBuffer = '';
  const dataArr: object[] = [];

  while (i < input.length) {
    const char = input[i++];

    if (char === '{') {
      openCurlyBraceCount++;
      stringBuffer += char;
      continue;
    }

    if (char === '}') {
      openCurlyBraceCount--;
      stringBuffer += char;
      if (openCurlyBraceCount === 0) {
        try {
          const parsed = JSON.parse(stringBuffer);
          dataArr.push(parsed);
        } catch (error) {
          // console.log('NextObject parse error', error, stringBuffer);
        } finally {
          stringBuffer = '';
        }

        if (terminateOnFirstObject) {
          break;
        }
      }
      continue;
    }

    if (openCurlyBraceCount) {
      stringBuffer += char;
      continue;
    }
  }

  return dataArr;
};

export const findRefData = (input: string, refKey: string): object | string => {
  const refIndexOf = input.indexOf(refKey + ':');

  if (refIndexOf === -1) {
    return `${refKey} (extension-note: ref could not be found)`;
  }
  const startIndex = refIndexOf + `${refKey}:`.length;
  const extractedJsonObjects = extractJson(input, startIndex, true);
  if (!extractedJsonObjects[0]) {
    return `${refKey} (extension-note: ref could not be resolved)`;
  }

  return extractedJsonObjects[0];
};

const MAX_DEPTH = 4;
export const resolveRefOfAnObject = (input: string, objectItem: object, depth: number = 1): object => {
  if (depth > MAX_DEPTH) {
    return objectItem;
  }

  if (!objectItem || typeof objectItem !== 'object') {
    return objectItem;
  }

  const newObject = {};
  const entries = Object.entries(objectItem);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];

    if (typeof value === 'string' && value.startsWith('$')) {
      const refKey = value.slice(1);
      const refData = findRefData(input, refKey);

      newObject[key] = refData;

      if (typeof refData === 'object') {
        newObject[key] = resolveRefOfAnObject(input, refData, depth + 1);
      }

      continue;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        newObject[key] = [];
        for (let j = 0; j < value.length; j++) {
          newObject[key][j] = resolveRefOfAnObject(input, value[j], depth + 1);
        }
        continue;
      }

      newObject[key] = resolveRefOfAnObject(input, value, depth + 1);
      continue;
    }

    newObject[key] = value;
  }

  return newObject;
};

export const getCurrentWindowTab = () => {
  return new Promise<chrome.tabs.Tab | undefined>(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      const tab = tabs[0];
      resolve(tab);
    });
  });
};
