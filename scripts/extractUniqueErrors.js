const fs = require('fs');

const DEADCLICK_URLS = JSON.parse(fs.readFileSync('../data/urls.json', 'utf8'));
const ERRORS_PATH_1 = '../data/errorsWithoutPB';
const ERRORS_PATH_2 = '../data/errorsWithPB';

const OUTPUT_PATH_1 = '../data/uniqueErrorsWithoutPB';
const OUTPUT_PATH_2 = '../data/uniqueErrorsWithPB';

function sameStackTrace(stackTrace1, stackTrace2) {
  const { callFrames: callFrames1 } = stackTrace1;
  const { callFrames: callFrames2 } = stackTrace2;
  if (callFrames1.length !== callFrames2.length) return false;
  for (let i = 0; i < callFrames1.length; i++) {
    if (callFrames1[i].functionName !== callFrames2[i].functionName ||
        callFrames1[i].url !== callFrames2[i].url ||
        // callFrames1[i].lineNumber !== callFrames2[i].lineNumber ||
        callFrames1[i].columnNumber !== callFrames2[i].columnNumber) {
      return false;
    }
  }
  return true;
}

function sameException(exceptionDetails1, exceptionDetails2) {
  return (exceptionDetails1.text === exceptionDetails2.text &&
          exceptionDetails1.url === exceptionDetails2.url &&
          sameStackTrace(exceptionDetails1.stackTrace, exceptionDetails2.stackTrace) &&
          exceptionDetails1.exception.type === exceptionDetails2.exception.type &&
          exceptionDetails1.exception.subtype === exceptionDetails2.exception.subtype &&
          exceptionDetails1.exception.className === exceptionDetails2.exception.className);
}

function findUniqueErrors(urls, path1, path2) {
  const uniqueErrorsFolder1 = new Map();
  const uniqueErrorsFolder2 = new Map();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    console.log(i + ': Comparing ' + url);
    const shortUrl = url.replace(/https?:\/\/(www\.)?/, '');
    const filename = `${i}-${shortUrl.slice(0, shortUrl.indexOf('/'))}.json`;
    try {
      const path1Errors = JSON.parse(fs.readFileSync(`${path1}/${filename}`, 'utf8'));
      const path2Errors = JSON.parse(fs.readFileSync(`${path2}/${filename}`, 'utf8'));

      const uniqueErrorsForUrl1 = path1Errors.filter(error1 =>
        path2Errors.filter(error2 => sameException(error1.exceptionDetails, error2.exceptionDetails))
                     .length === 0
      );
      if (uniqueErrorsForUrl1.length > 0) {
        uniqueErrorsFolder1.set(filename, uniqueErrorsForUrl1);
      }

      const uniqueErrorsForUrl2 = path2Errors.filter(error2 =>
        path1Errors.filter(error1 => sameException(error1.exceptionDetails, error2.exceptionDetails))
                     .length === 0
      );
      if (uniqueErrorsForUrl2.length > 0) {
        uniqueErrorsFolder2.set(filename, uniqueErrorsForUrl2);
      }
    } catch (e) {
      console.error(i + ': Error comparing ' + url);
      console.error(e);
    }
  }
  
  return [uniqueErrorsFolder1, uniqueErrorsFolder2];
}

function writeErrors(filenameToErrorsMap, outputFolder) {
  filenameToErrorsMap.forEach((errors, filename) => {
    fs.writeFileSync(`${outputFolder}/${filename}`, JSON.stringify(errors, null, 2));
  });
}

(() => {
  const [ uniqueErrors1, uniqueErrors2 ] = findUniqueErrors(DEADCLICK_URLS, ERRORS_PATH_1, ERRORS_PATH_2);
  writeErrors(uniqueErrors1, OUTPUT_PATH_1);
  writeErrors(uniqueErrors2, OUTPUT_PATH_2);
})();
