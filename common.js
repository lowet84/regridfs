const databaseName = 'regridfs'
const nodeTable = 'inodes'
const miscTable = 'misc'
const mybucket_chunks = 'mybucket_chunks'

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
    await r.db(databaseName).table(miscTable).insert({ id: 'nextInode', value: 1 })
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
  var exists = await r.db(databaseName).table(nodeTable).get(1).run()
  if (exists === null) {
    console.log('creating root folder')
    await r.db(databaseName).table(nodeTable).insert({
      nodes: [],
      name: 'root',
      id: await getNextINode(),
      created: Date.now(),
      modified: Date.now(),
      parent: -1
    })
  }
}

let readFile = async function (fileId, length, offset) {
  let end = offset + length
  let fileLengthInDb = await r.db(databaseName)
    .table(mybucket_chunks)
    .filter({ file_id: fileId })('data').nth(0).count().run()

  if (fileLengthInDb == 0) {
    return { length: 0, buffer: new Buffer(0) }
  }
  let result = await bucket.readFile({ id: fileId, seekStart: offset, seekEnd: end })
  return result
}

let addDir = async function (inode, name) {
  let parent = await r.db(databaseName).table(nodeTable).get(inode).run()
  let newDir = {
    nodes: [],
    name: name,
    id: await getNextINode(),
    created: await now(),
    modified: await now(),
    parent: inode,
    mode: 16895
  }
  parent.nodes.push(newDir.id)

  await r.db(databaseName).table(nodeTable).insert(newDir).run()
  await r.db(databaseName).table(nodeTable).get(inode).update(parent).run()
  return newDir.id
}

let addFile = async function (inode, file) {
  let folder = await r.db(databaseName).table(nodeTable).get(inode).run()
  var exists = await r.db(databaseName).table(nodeTable)
    .filter({ name: file.filename, parent: inode })
  if (exists.length > 0) {
    return null
  }
  let newFile = await bucket.writeFile(file)
  let fileInFolder = {
    id: await getNextINode(),
    name: file.filename,
    fileId: newFile.id,
    created: await now(),
    modified: await now(),
    size: file.buffer.length,
    parent: inode,
    mode: 33279
  }
  folder.nodes.push(fileInFolder.id)
  await r.db(databaseName).table(nodeTable).insert(fileInFolder).run()
  await r.db(databaseName).table(nodeTable).get(inode).update(folder).run()
  return fileInFolder
}

let initBucket = async function () {
  const ReGrid = require('rethinkdb-regrid');
  bucket = ReGrid({ db: databaseName }, { bucketName: 'mybucket' })
  await bucket.initBucket()
}

let getNode = async function (inode) {
  return await r.db(databaseName).table(nodeTable).get(inode).run()
}

let now = async function () {
  return new Date().getTime()
}

let getFolder = async function (inode) {
  return await r
    .db(databaseName)
    .table(nodeTable)
    .get(inode)
    .merge(node => {
      return {
        nodes: node('nodes')
          .map(subNode => {
            return r.db(databaseName).table(nodeTable).get(subNode)
          }),
        parent: r.db(databaseName).table(nodeTable).get(node('parent')).default(null)
      }
    })
    .run()
}

let updateNode = async function (inodeItem) {
  await r.db(databaseName)
    .table(nodeTable).get(inodeItem.id)
    .update(inodeItem).run()
}

let getNodeAttr = async function (item) {
  let mode = null
  let size = null
  let nlink = null
  let inode = null
  let created = null
  let modified = null
  if (item === null) {
    mode = 16895
    size = 4096
    nlink = 1
    inode = 1
    created = Date.now()
    modified = Date.now()
  }
  else {
    inode = item.id
    created = item.created
    modified = item.modified
    mode = item.mode

    if (item.fileId !== undefined) {
      size = item.size
      nlink = 1
    }
    else {
      size = 4096
      nlink = 1 + item.nodes.length
    }
  }
  let attr = {
    inode: inode,
    ctime: created,
    mtime: modified,
    mode: mode,
    size: size,
    nlink: nlink
  }
  return attr
}

let debug = async function (name, values) {
  console.log(`====${name}====`)
  values.forEach(element => {
    console.log(JSON.stringify(element))
  }, this);
  console.log(`<><><><><><><><><>`)
}

module.exports = {
  init,
  bucket,
  addDir,
  addFile,
  getNode,
  getNodeAttr,
  getFolder,
  readFile,
  debug,
  updateNode
}