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
  await debug()
  console.log('done')
}

let getTestFile = async function (number) {
  var fileBuffer = Buffer.from(`A${number}`, 'utf8');
  return { filename: `test${number}.txt`, buffer: fileBuffer }
}

let debug = async function () {
  const parentInode = 1
  const name = 'sdijslifjsdf'
  let parentItem = await common.getFolder(parentInode)
  if (parentItem === null) {
    return
  }
  var item = await parentItem.nodes.find(d => d.name === name)
  if (item === undefined) {
    return
  }
  let inodeItem = await common.getNode(item.id)
  if (inodeItem === null) {
    return
  }
  let attr = await common.getNodeAttr(inodeItem)
  const entry = {
    inode: item.id,
    attr: attr,
    generation: 1
  }
}

start()