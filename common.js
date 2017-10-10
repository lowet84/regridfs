const databaseName = 'regridfs'
const nodeTable = 'inodes'
const miscTable = 'misc'

var r = null
var bucket = null

async function init (host, reset) {
  r = require('rethinkdbdash')({
    servers: [
      { host: host }
    ]
  })

  await initDb(reset)
  await initBucket()
  await addRootIfNeeded()
}

let initDb = async function (reset) {
  var dbs = await r.dbList().run()
  if (reset === true) {
    if (dbs.includes(databaseName)) {
      console.log('dropping db')
      await r.dbDrop(databaseName).run()
      dbs = []
    }
  }
  if (!dbs.includes(databaseName)) {
    console.log('creating db')
    await r.dbCreate(databaseName).run()
    await r.db(databaseName).tableCreate(nodeTable).run()
    await r.db(databaseName).tableCreate(miscTable).run()
    await r.db(databaseName).table(miscTable).insert({ id: 'nextInode', value: 0 })
  }
}

let getNextINode = async function () {
  let inode = await r.db(databaseName).table(miscTable).get('nextInode').run()
  let value = inode.value
  await r.db(databaseName)
    .table(miscTable)
    .get('nextInode')
    .update({ value: value + 1 })
    .run()
  return value
}

let addRootIfNeeded = async function () {
  var exists = await r.db(databaseName).table(nodeTable).get(0).run()
  if (exists === undefined) {
    console.log('creating root folder')
    await r.db(databaseName).table(nodeTable).insert({
      files: [],
      subdirs: [],
      id: await getNextINode()
    })
  }
}

let addDir = async function (inode, name) {
  let parent = await r.db(databaseName).table(nodeTable).get(inode).run()
  let newDir = {
    files: [],
    subdirs: [],
    id: await getNextINode(),
    created: Date.now(),
    modified: Date.now()
  }
  parent.subdirs.push({ id: newDir.id, name: name })

  await r.db(databaseName).table(nodeTable).insert(newDir).run()
  await r.db(databaseName).table(nodeTable).get(inode).update(parent).run()
  return newDir.id
}

let addFile = async function (inode, file) {
  let folder = await r.db(databaseName).table(nodeTable).get(inode).run()
  let newFile = await bucket.writeFile(file)
  let fileInFolder = {
    id: await getNextINode(),
    filename: file.filename,
    fileId: newFile.id
  }
  folder.files.push(fileInFolder)
  fileInFolder.created = Date.now()
  fileInFolder.modified = Date.now()
  fileInFolder.size = file.buffer.length
  await r.db(databaseName).table(nodeTable).insert(fileInFolder).run()
  await r.db(databaseName).table(nodeTable).get(inode).update(folder).run()
  return newFile
}

let initBucket = async function () {
  const ReGrid = require('rethinkdb-regrid');
  bucket = ReGrid({ db: databaseName }, { bucketName: 'mybucket' })
  await bucket.initBucket()
}

let getNode = async function (inode) {
  return await r.db(databaseName).table(nodeTable).get(inode).run()
}

module.exports = { init, bucket, addDir, addFile, getNode }