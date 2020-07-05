const { stateCollector, reproductionProxy, utils } = require('DeadClick');
const fs = require('fs');

const pbErrorUrls = JSON.parse(fs.readFileSync('DeadClick-urls_2020-06-08/pb_error_urls.json'));

/**
 * Returns all errors only found in errors2
 */
function extractAddedErrors(errors1, errors2) {
  return errors2.filter(err2 => {
    errors1.some(err1 => {
      utils.getErrorMessage(err1) === utils.getErrorMessage(err2)
    })
  });
}

function extractAddedErrorsOld(ogState, pbState) {
  const addedErrors = [];
  for (const pbError of pbState.errors) {
    let j;
    for (j = 0; j < ogState.errors.length; j++) {
      ogError = ogState.errors[j];
      if (utils.getErrorMessage(pbError) === utils.getErrorMessage(ogError)) {
        break;
      }
    }
    if (j === ogState.errors.length) {
      addedErrors.push(pbError);
    }
  }
  return addedErrors;
}

async function compareAll(urls) {
  const reproduced = [];
  const reproducedPbErrors = [];
  const increasedErrorsAfterRepair = [];
  const notReproduced = [];
  const errorReproducing = [];
  for (const url of urls) {
    try {
      const originalState = await utils.loadState(url, __dirname + '/DeadClick-urls_2020-06-08/webtraces/');
      const pbState = await utils.loadState(url, __dirname + '/DeadClick-urls_2020-06-08/webtraces_pb/');
      const repairedState = await utils.loadState(url, __dirname + '/DeadClick-urls_2020-06-08/webtraces_pb_repaired/');
      const isReproduced = reproductionProxy.compareStates(pbState, repairedState);
      console.log(isReproduced);
      if (isReproduced === true) {
        reproduced.push(url);
      } else {
        const pbErrors = extractAddedErrors(originalState.errors, pbState.errors);
        const pbErrorsAfterRepair = extractAddedErrors(originalState.errors, repairedState.errors);
        const repairedPbErrors = extractAddedErrors(repairedState.errors, pbErrors);
        if (repairedPbErrors.length > 0) {
          notReproduced.push(url);
        } else {
          reproducedPbErrors.push(url);
        }
      }
    } catch (e) {
      errorReproducing.push(url);
    }
  }
  console.log('NOT REPAIRED (no change): ' + reproduced.length);
  console.log(reproduced);
  console.log('\n');
  console.log('NOT PB REPAIRED: ' + reproducedPbErrors.length);
  console.log(reproducedPbErrors);
  console.log('\n');
  console.log('ERROR(S) REPAIRED: ' + notReproduced.length);
  console.log(notReproduced);
  console.log('\n');
  console.log('\n');
  console.log('ERROR REPAIRING: ' + errorReproducing.length);
  console.log(errorReproducing);
  
  /*
  fs.writeFileSync('DeadClick-urls_2020-06-08/prob_repaired_urls.json', JSON.stringify(notReproduced, null, 2));
  fs.writeFileSync('DeadClick-urls_2020-06-08/not_repaired_urls.json', JSON.stringify(reproduced, null, 2));
  fs.writeFileSync('DeadClick-urls_2020-06-08/not_pb_repaired_urls.json', JSON.stringify(reproducedPbErrors, null, 2));
  fs.writeFileSync('DeadClick-urls_2020-06-08/error_repairing.json', JSON.stringify(errorReproducing, null, 2));
  */
}

(async () => {
  await compareAll(pbErrorUrls);
})();
