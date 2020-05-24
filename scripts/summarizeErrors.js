const { stateCollector, reproductionProxy, utils } = require('DeadClick');
const fs = require('fs');
const md5 = require('md5');

const errorUrls = JSON.parse(fs.readFileSync('pb_error_urls.json', 'utf8'));
const pathToWebtraces = '../webtraces_pb_bikiniproxy/';
const noErrorPath = '../no-error_pb_bikiniproxy/';

async function summarizeAll(urls) {
  const errorData = [];
  for (const url of urls) {
    console.log(url);
    const requestFolder = fs.existsSync(pathToWebtraces + md5(url)) ? pathToWebtraces : noErrorPath;
    try {
      const request = JSON.parse(fs.readFileSync(`${requestFolder}${md5(url)}/request.json`));
      errorData.push({
        url,
        nbRequests: request.requests.length,
        errors: request.errors.map(error => utils.getErrorMessage(error))
      })
    } catch (e) {
      console.log('No request.json for url ' + url);
      errorData.push({
        url,
        nbRequests: 0,
        errors: []
      });
    }
  }
  return errorData;
}

(async () => {
  const summarizedErrorData = await summarizeAll(errorUrls);
  fs.writeFileSync('errors_with_pb_bikiniproxy.json', JSON.stringify(summarizedErrorData, null, 2))
})();
