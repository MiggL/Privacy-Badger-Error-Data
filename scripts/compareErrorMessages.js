const fs = require('fs');

const DEADCLICK_URLS = JSON.parse(fs.readFileSync('../data/urls.json', 'utf8'));
const ERRORS_PATH_1 = '../data/errorsWithoutPB';
const ERRORS_PATH_2 = '../data/errorsWithPB';
const COMPARE_LOST_FILE = false;

const OUTPUT_FILE_PATH = '../data/errorMessageStatistics.json';

function folderName(path) {
  return path.slice(path.lastIndexOf('/') + 1);
}

function compareErrors(urls, path1, path2) {
  const errorStatisticsMap = new Map();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    console.log(i + ': Comparing ' + url);
    const shortUrl = url.replace(/https?:\/\/(www\.)?/, '');
    const filename = `${i}-${shortUrl.slice(0, shortUrl.indexOf('/'))}.json`;

    function countErrors(path) {
      JSON.parse(fs.readFileSync(`${path}/${filename}`, 'utf8'))
          .map(({ exceptionDetails }) => exceptionDetails.exception)
          .forEach(({className, preview}) => {
        const errorMessages = errorStatisticsMap.get(className) || new Map();
        preview.properties.filter(({name}) => name === 'message')
                          .forEach(({value}) => {
                            const collectionName = folderName(path);
                            const msg = value.replace(/'.*'/g, 'XXX')
                                             .replace(/.+ is not/g, 'XXX is not');
                            const msgObj = errorMessages.get(msg);
                            if (msgObj) {
                              const prevMsgCount = msgObj[collectionName] || 0;
                              msgObj[collectionName] = prevMsgCount + 1;
                            } else {
                              errorMessages.set(msg, { [collectionName]: 1 });
                            }
                          });
        errorStatisticsMap.set(className, errorMessages);
      })
    }

    if (COMPARE_LOST_FILE) {
      try {
        countErrors(path1);
      } catch (e) {
        console.error(e);
      }
      try {
        countErrors(path2);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        // try to read both files before adding data to Map
        fs.readFileSync(`${path1}/${filename}`, 'utf8');
        fs.readFileSync(`${path2}/${filename}`, 'utf8');
        countErrors(path1);
        countErrors(path2);
      } catch (e) {
        console.error(i + ': Error comparing ' + url);
        console.error(e);
      }
    }
  }
  
  return errorStatisticsMap;
}

function statisticsAsPrettyJsonString(errorStatisticsMap, folderName1, folderName2) {
  const errorStatistics = [];
  errorStatisticsMap.forEach((errorMessages, className) => errorStatistics.push({
    className,
    errorMessages: [...errorMessages.keys()].map((message) => ({
      message,
      [folderName1]: errorMessages.get(message)[folderName1],
      [folderName2]: errorMessages.get(message)[folderName2]
    }))
  }));
  return JSON.stringify(errorStatistics, null, 2);
}

(() => {
  const errorStatisticsMap = compareErrors(DEADCLICK_URLS, ERRORS_PATH_1, ERRORS_PATH_2);

  fs.writeFileSync(OUTPUT_FILE_PATH, statisticsAsPrettyJsonString(errorStatisticsMap, folderName(ERRORS_PATH_1), folderName(ERRORS_PATH_2)));
})();
