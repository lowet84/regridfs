"use strict";

const databaseName = 'regridfs'
const dirTable = 'directories'
const miscTable = 'misc'
var bucket = null


let start = async function () {
  await initDb()
  await initBucket()
  await addRoot()
  let somedirId = await addSomeDir(0, 'somedir')
  let newFile = await addFile(somedirId, await getTestFile())
  console.log(newFile)
}

let initDb = async function () {
  var dbs = await r.dbList().run()
  if (dbs.includes(databaseName)) {
    console.log('dropping db')
    await r.dbDrop(databaseName).run()
  }
  console.log('creating db')
  await r.dbCreate(databaseName).run()
  await r.db(databaseName).tableCreate(dirTable).run()
  await r.db(databaseName).tableCreate(miscTable).run()
  await r.db(databaseName).table(miscTable).insert({ id: 'nextInode', value: 0 })
}

let initBucket = async function () {
  const ReGrid = require('rethinkdb-regrid');
  bucket = ReGrid({ db: databaseName }, { bucketName: 'mybucket' })
  await bucket.initBucket()
}

let addRoot = async function () {
  await r.db(databaseName).table(dirTable).insert({
    files: [],
    subdirs: [],
    id: await getINode()
  })
}

let getINode = async function () {
  let inode = await r.db(databaseName).table(miscTable).get('nextInode').run()
  let value = inode.value
  await r.db(databaseName)
    .table(miscTable)
    .get('nextInode')
    .update({ value: value + 1 })
    .run()
  return value
}

let addFile = async function (inode, file) {
  let folder = await r.db(databaseName).table(dirTable).get(inode).run()
  let newFile = await bucket.writeFile(file)
  let fileInFolder = {
    inode: await getINode(),
    filename: file.filename,
    fileId: newFile.id
  }
  folder.files.push(fileInFolder)
  await r.db(databaseName).table(dirTable).get(inode).update(folder).run()
  return newFile
}

let getTestFile = async function () {
  var fileBuffer = Buffer.from("TEST!!!", 'utf8');
  return { filename: 'test.txt', buffer: fileBuffer }
}

let addSomeDir = async function (inode, name) {
  let parent = await r.db(databaseName).table(dirTable).get(inode).run()
  let newDir = {
    files: [],
    subdirs: [],
    id: await getINode()
  }
  parent.subdirs.push({ id: newDir.id, name: name })

  await r.db(databaseName).table(dirTable).insert(newDir).run()
  await r.db(databaseName).table(dirTable).get(inode).update(parent).run()
  return newDir.id
}

var r = require('rethinkdbdash')()

start()