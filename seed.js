"use strict";

let common = require('./common')

let start = async function () {
  await common.init('localhost',true)
  let somedirId = await common.addDir(0, 'somedir')
  await common.addFile(somedirId, await getTestFile())
  console.log(JSON.stringify(await common.getFolder(0)))
  console.log('done')
}

let getTestFile = async function () {
  var fileBuffer = Buffer.from("TEST!!!", 'utf8');
  return { filename: 'test.txt', buffer: fileBuffer }
}

start()