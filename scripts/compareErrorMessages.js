const fs = require('fs');

const PATH_TO_DATA = '../data/';

const DEADCLICK_URLS = JSON.parse(fs.readFileSync(PATH_TO_DATA + 'urls.json', 'utf8'));
const ERRORS_PATH_1 = PATH_TO_DATA + 'errorsWithoutPB';
const ERRORS_PATH_2 = PATH_TO_DATA + 'errorsWithPB';

const OUTPUT_FILE_PATH = PATH_TO_DATA + 'errorMessageStatistics.json';

function compareErrors(urls, folder1, folder2) {
  const errorStatisticsMap = new Map();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    console.log(i + ': Comparing ' + url);
    const shortUrl = url.replace(/https?:\/\/(www\.)?/, '');
    const fileName = `${i}-${shortUrl.slice(0, shortUrl.indexOf('/'))}.json`;

    function countErrors(folder) {
      const exceptions = JSON.parse(fs.readFileSync(`${folder}/${fileName}`, 'utf8'))
                             .map(({exceptionDetails}) => exceptionDetails.exception);
      exceptions.forEach(({className, preview}) => {
        const errorMessages = errorStatisticsMap.get(className) || new Map();
        preview.properties.filter(({name}) => name === 'message')
                          .forEach(({value}) => {
                            const collectionName = folder.slice(1 + folder.lastIndexOf('/'));
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

    try {
      countErrors(folder1);
      countErrors(folder2);
    } catch (e) {
      console.error(i + ': Error comparing ' + url);
      console.error(e);
      continue;
    }
  }
  
  return errorStatisticsMap;
}

function statisticsAsPrettyJsonString(errorStatisticsMap) {
  const errorStatistics = [];
  errorStatisticsMap.forEach((errorMessages, className) => errorStatistics.push({
    className,
    errorMessages: [...errorMessages.keys()].map((message) => ({
      message,
      amount: errorMessages.get(message).errorsWithoutPB,
      amountWithPrivacyBadger: errorMessages.get(message).errorsWithPB
    }))
  }));
  return JSON.stringify(errorStatistics, null, 2);
}

(() => {
  const errorStatisticsMap = compareErrors(DEADCLICK_URLS, ERRORS_PATH_1, ERRORS_PATH_2);

  fs.writeFileSync(OUTPUT_FILE_PATH, statisticsAsPrettyJsonString(errorStatisticsMap));
})();
