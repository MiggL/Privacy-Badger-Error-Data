const stateCollector = require('DeadClick').stateCollector;
const utils = require('DeadClick').utils;
const fs = require('fs');

const DEADCLICK_URLS = JSON.parse(fs.readFileSync('../data/urls.json', 'utf8'));
const OUTPUT_FOLDER = '../data/errorsWithoutPB2';

async function collectAll(urls, outputFolder) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const collectedState = await stateCollector.collectPage({
        url: url, // the url of the page to collect
        proxy: null, // the url of the proxy URL (for example, localhost:8001)
        collectScreenShot: false, // collect or not the screenshot
        timeout: 25000, // the timeout of the request
        useragent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.108 Safari/537.36',screenWidth: 1280, screenHeight: 600 // the screen size of the page
      });
      collectedState.errors.forEach((error, index) => {
        console.log(index);
        console.log(error.exceptionDetails);
      });
      console.log('Visited ' + url);
      if (outputFolder) {
        const shortUrl = url.replace(/https?:\/\/(www\.)?/, '');
        const fileName = `${i}-${shortUrl.slice(0, shortUrl.indexOf('/'))}.json`;
        fs.writeFileSync(`${outputFolder}/${fileName}`, JSON.stringify(collectedState.errors, null, 2));
      }
    } catch(e) {
      console.error(e);
    }
  }
}

(async () => {
  await collectAll(DEADCLICK_URLS, OUTPUT_FOLDER);

  await utils.closeBrowser();
})();
