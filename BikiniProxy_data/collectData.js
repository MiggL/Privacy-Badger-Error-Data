const { stateCollector, reproductionProxy, utils } = require('DeadClick');
const repairModels = require('../../repair_models/repair_models');
const Bikiniproxy = require('../../repair_models/bikiniproxy');
const fs = require('fs');
const URL = require('url');

// const deadclickUrls = JSON.parse(fs.readFileSync('../urls.json', 'utf8'));
const pbErrorUrls = JSON.parse(fs.readFileSync('DeadClick-urls_2020-06-08/pb_error_urls.json', 'utf8'));

const webtracesDir = __dirname + '/DeadClick-urls_2020-06-08/webtraces/';
const webtracesPbDir = webtracesDir + '../webtraces_pb/';
const webtracesPbRepairedDir = webtracesPbDir + '../webtraces_pb_repaired/';

async function getState(url, proxyUrl = null) {
  return await stateCollector.collectPage({
    url: url,
    proxy: proxyUrl,
    collectScreenShot: false,
    timeout:25000
  });
}

async function collectAll(urls, proxy = null, savePath = utils.requestsPath) {
  const collectedUrls = [];
  const notCollectedUrls = [];
  for (const url of urls) {
    console.log(url);
    try {
      if (proxy) {
        proxy.requestState = await utils.loadState(url);
      }
      const collectedState = await getState(url, proxy ? 'localhost:' + proxy.port : null);
      await stateCollector.serializeState(collectedState, savePath);
      collectedUrls.push(url);
    } catch (e) {
      console.error(e);
      notCollectedUrls.push(url);
    }
  }
  console.log('Collected: ' + collectedUrls.length);
  console.log('Not collected: ' + notCollectedUrls.length);
  // fs.writeFileSync(savePath + '../pb_collected_urls.json', JSON.stringify(collectedUrls, null, 2));
  // fs.writeFileSync(savePath + '../pb_not_collected_urls.json', JSON.stringify(notCollectedUrls, null, 2));
}

function isJavascriptRequest(contentType) {
  const contentTypeLowerCase = contentType.toLowerCase();
  const contentTypeMatch = contentTypeLowerCase.indexOf('html') !== -1
                        || contentTypeLowerCase.indexOf('javascript') !== -1
                        || contentTypeLowerCase.indexOf('js') !== -1;
  return contentTypeMatch;
}

async function repairAll(urls, proxy, savePath, requestsPath = utils.requestsPath) {
  proxy.onRequest = async function(request) {
    if (request.statusCode === 500) {
      const url = new URL.URL(request.url);
      if (url.searchParams.has('bikinirepair')) {
        url.searchParams.delete('bikinirepair');

        const newOption = Object.assign({}, request.requestDetail.requestOptions);
        newOption.path = url.pathname + url.searchParams;
        return { requestOptions: newOption };
      } else {
        return request;
      }
    }
    if (!isJavascriptRequest(request.contentType)) {
      return request;
    }

    (new repairModels[0]).resetASTCache();
    for (const error of proxy.requestState.errors) {
      for (const RepairModel of repairModels) {
        if (error.handled) {
          continue;
        }
        const repairModel = new RepairModel(proxy.requestState, error, request);
        const isEnable = repairModel.isEnable();
        const isToApply = await repairModel.isToApply();
        if (isEnable && isToApply) {
          await repairModel.repair();
          const output = { url: request.url, name: repairModel.name, description: repairModel.description, enable: isEnable, isToApply: isEnable ? isToApply : false, error: error };
          console.log(output);
          // console.log(error.exceptionDetails);
        }
      }
    }
    const bikiniproxy = new Bikiniproxy(proxy.requestState, null, request);
    if (await bikiniproxy.isToApply()) {
      await bikiniproxy.repair();
    }
    return request;
  }
  for (const url of urls) {
    console.log('\n');
    console.log(url);
    try {
      // const originalState = await utils.loadState(url, requestsPath + '../webtraces/');
      // console.log('Errors without Privacy Badger = ' + originalState.errors.length);
      const expectedState = await utils.loadState(url, requestsPath);
      console.log('Errors with Privacy Badger =    ' + expectedState.errors.length);
      proxy.requestState = expectedState;
      const collectedState = await getState(url, 'localhost:' + proxy.port);
      console.log('Errors after repair =           ' + collectedState.errors.length);
      if (savePath) {
        await stateCollector.serializeState(collectedState, savePath);
      }
    } catch (e) {
      console.error('ERROR WHEN REPAIRING');
      console.error(e);
    }
  }
}

async function reproduceAll(urls, proxy, requestsPath = utils.requestsPath) {
  const reproduced = [];
  const notReproduced = [];
  const errorReproducing = [];
  for (const url of urls) {
    console.log(url);
    try {
      const expectedState = await utils.loadState(url, requestsPath);
      const isReproduced = await reproductionProxy.reproduceRequestState(expectedState, proxy);
      console.log(isReproduced);
      if (isReproduced === true) {
        reproduced.push(url);
      } else {
        notReproduced.push(url);
      }
    } catch (e) {
      console.error(e);
      errorReproducing.push(url);
    }
  }
  console.log('REPRODUCED:');
  console.log(reproduced);
  console.log('\n');
  console.log('NOT REPRODUCED:');
  console.log(notReproduced);
  console.log('\n');
  console.log('ERROR REPRODUCING:');
  console.log(errorReproducing);
  
  /*
  fs.writeFileSync(requestsPath + '../repr_no_error_diff_urls.json', JSON.stringify(reproduced, null, 2));
  fs.writeFileSync(requestsPath + '../repr_error_diff_urls.json', JSON.stringify(notReproduced, null, 2));
  fs.writeFileSync(requestsPath + '../error_reproducing.json', JSON.stringify(errorReproducing, null, 2));
  */
}

(async () => {
  const proxy = await reproductionProxy.startReproductionProxy();
  // await collectAll(deadclickUrls, proxy, webtracesTestPbDir);
  // await reproduceAll(deadclickUrls, proxyPb, webtracesPbDir);
  await repairAll(pbErrorUrls, proxy, webtracesPbRepairedDir, webtracesPbDir);
  await utils.closeBrowser();
  await proxy.close();
})();
