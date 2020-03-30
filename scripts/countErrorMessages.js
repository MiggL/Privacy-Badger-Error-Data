const fs = require('fs');

const DEADCLICK_URLS = JSON.parse(fs.readFileSync('../data/urls.json', 'utf8'));
const ERRORS_PATH = '../data/uniqueErrorsWithPB';

const OUTPUT_FILE_PATH = '../data/uniqueErrorMessageStatisticsWithPB.json';

function countErrorMessages(urls, folder) {
  const errorStatisticsMap = new Map();

  urls.forEach((url, i) => {
    console.log(i + ': Comparing ' + url);
    const shortUrl = url.replace(/https?:\/\/(www\.)?/, '');
    const filename = `${i}-${shortUrl.slice(0, shortUrl.indexOf('/'))}.json`;

    try {
      const exceptions = JSON.parse(fs.readFileSync(`${folder}/${filename}`, 'utf8'))
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
                              const prevMsgCount = msgObj.amount || 0;
                              msgObj.amount = prevMsgCount + 1;
                            } else {
                              errorMessages.set(msg, { amount: 1 });
                            }
                          });
        errorStatisticsMap.set(className, errorMessages);
      })
    } catch (e) {
      console.error(i + ': Error comparing ' + url);
      console.error(e);
    }
  });
  
  return errorStatisticsMap;
}

function statisticsAsPrettyJsonString(errorStatisticsMap) {
  const errorStatistics = [];
  errorStatisticsMap.forEach((errorMessages, className) => errorStatistics.push({
    className,
    errorMessages: [...errorMessages.keys()].map((message) => ({
      message,
      amount: errorMessages.get(message).amount,
    }))
  }));
  return JSON.stringify(errorStatistics, null, 2);
}

(() => {
  const errorStatisticsMap = countErrorMessages(DEADCLICK_URLS, ERRORS_PATH);

  fs.writeFileSync(OUTPUT_FILE_PATH, statisticsAsPrettyJsonString(errorStatisticsMap));
})();
