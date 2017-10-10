"use strict";

let common = require('./common')

let start = async function () {
  await common.init('localhost',true)
  let somedirId = await common.addDir(1, 'somedir')
  await common.addFile(somedirId, await getTestFile())
  console.log(JSON.stringify(await common.getFolder(1)))
  console.log('done')
}

let getTestFile = async function () {
  var fileBuffer = Buffer.from("TEST!!!", 'utf8');
  return { filename: 'test.txt', buffer: fileBuffer }
}

start()