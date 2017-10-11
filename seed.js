"use strict";

let common = require('./common')

let start = async function () {
  await common.init('localhost', true)
  let somedirId = await common.addDir(1, 'somedir')
  await common.addFile(somedirId, await getTestFile(1))
  await common.addFile(somedirId, await getTestFile(2))
  await common.addFile(somedirId, await getTestFile(3))
  await common.addFile(somedirId, await getTestFile(4))
  await common.addFile(somedirId, await getTestFile(5))
  await common.addFile(somedirId, await getTestFile(6))
  await common.addFile(somedirId, await getTestFile(7))
  console.log(JSON.stringify(await common.getFolder(1)))
  await debug(6, 4096, 0)
  console.log('done')
}

let getTestFile = async function (number) {
  var fileBuffer = Buffer.from(`A${number}`, 'utf8');
  return { filename: `test${number}.txt`, buffer: fileBuffer }
}

let debug = async function (inode, len, offset) {
  let inodeItem = await common.getNode(inode)
  if (inodeItem === null) {
    return
  }

  const length = inodeItem.size
  let result = await common.readFile(inodeItem.fileId, Math.min(length, offset + len), offset)
  console.log(result)
}

start()