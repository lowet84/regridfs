const databaseName = 'regridfs'
const nodeTable = 'inodes'
const miscTable = 'misc'
const filesTable = 'files'

var r = null

async function init (host, reset) {
  r = require('rethinkdbdash')({
    servers: [
      { host: host }
    ]
  })

  await initDb(reset)
  // await initBucket()
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
    await r.db(databaseName).tableCreate(filesTable).run()
    await r.db(databaseName).table(filesTable).indexCreate('inode').run()
  }
}

let getNextINode = async function () {
  let inode = await r.db(databaseName).table(miscTable)
    .get('nextInode')
    .update({ value: r.row('value').add(1) }, { returnChanges: true }).run()
  let value = inode.changes[0].new_val.value
  return value
}

let addRootIfNeeded = async function () {
  var exists = await r.db(databaseName).table(nodeTable).get(1).run()
  if (exists === null) {
    console.log('creating root folder')
    await r.db(databaseName).table(nodeTable).insert({
      isDir: true,
      nodes: [],
      name: 'root',
      id: await getNextINode(),
      created: Date.now(),
      modified: Date.now(),
      parent: -1,
      mode: 16895
    })
  }
}

let readFile = async function (inode, length, offset) {
  let files = await r.db(databaseName)
    .table(filesTable)
    .filter({ inode: inode })
    .pluck('id')
    .orderBy('id')
    .coerceTo('Array')
    .run()

  let dataLeft = length
  let total = 0
  let data = new Buffer(0)
  for (var index = 0; index < files.length; index++) {
    let file = files[index]
    if (total >= offset) {
      let temp = await r.db(databaseName)
        .table(filesTable)
        .get(file.id)
        .run()
      var start = Math.max(offset - total, 0)
      var end = Math.min(dataLeft, chunkSize);
      let selected = await temp.data.slice(start, end)
      data = Buffer.concat([data, selected]);
      dataLeft -= selected.length
    }
    total += chunkSize
    if (total > offset + length) {
      break
    }
  }

  return { length: data.length, buffer: data }
}

let addDir = async function (inode, name) {
  let parent = await r.db(databaseName).table(nodeTable).get(inode).run()
  let newDir = {
    isDir: true,
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

let createFile = async function (inode, filename) {
  let folder = await r.db(databaseName).table(nodeTable).get(inode).run()
  var exists = await r.db(databaseName).table(nodeTable)
    .filter({ name: filename, parent: inode })
  if (exists.length > 0) {
    return null
  }
  let fileInFolder = {
    isDir: false,
    id: await getNextINode(),
    name: filename,
    created: await now(),
    modified: await now(),
    size: 0,
    parent: inode,
    mode: 33279
  }
  folder.nodes.push(fileInFolder.id)
  await r.db(databaseName).table(nodeTable).insert(fileInFolder).run()
  await r.db(databaseName).table(nodeTable).get(inode).update(folder).run()
  return fileInFolder
}

let getNode = async function (inode) {
  return await r.db(databaseName)
    .table(nodeTable)
    .get(inode)
    .run()
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

    if (!item.idDir) {
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

let chunkSize = 4096
let write = async function (inode, buffer, position) {
  let firstPart = Math.floor(position / chunkSize)



  let part = firstPart
  let dataLeft = buffer.length
  // Handle first part
  let offset = position % chunkSize
  if (offset > 0) {
    let toWrite = await buffer.slice(0, chunkSize - offset)
    let data = await r.db(databaseName)
      .table(filesTable)
      .get(`${inode}___${part}`)
      .run()
    if (data !== null) {
      let p1 = data.data.slice(0, offset)
      let p2 = data.data.slice(offset + toWrite.length, chunkSize)
      toWrite = await Buffer.concat([p1, toWrite, p2])
      await r.db(databaseName)
        .table(filesTable)
        .get(data.id)
        .update({ data: toWrite })
        .run()
    }
    else {
      console.log('cannot write to new part unless from the beginning of file')
      return
    }
    part++
    dataLeft -= (chunkSize - offset)
  }


  // Handle middle parts
  while (dataLeft >= chunkSize) {
    let id = `${inode}___${part}`
    let toWrite = await buffer.slice(
      part * chunkSize - offset,
      part * chunkSize + chunkSize - offset)
    let existing = await r.db(databaseName)
      .table(filesTable)
      .get(id)
      .pluck('id')
      .default(null)
      .run()
    if (existing !== null) {
      await r.db(databaseName)
        .table(filesTable)
        .get(id)
        .update({ data: toWrite })
        .run()
    }
    else {
      await r.db(databaseName)
        .table(filesTable)
        .insert({ id: id, data: toWrite, inode: inode })
        .run()
    }
    part++
    dataLeft -= chunkSize
  }

  // Handle last part
  if (dataLeft > 0) {
    let id = `${inode}___${part}`
    let toWrite = await buffer.slice(
      part * chunkSize - offset,
      part * chunkSize + dataLeft - offset)
    let data = await r.db(databaseName)
      .table(filesTable)
      .get(id)
      .run()
    if (data !== null) {
      let p2 = data.data.slice(offset + toWrite.length, chunkSize)
      toWrite = await Buffer.concat([toWrite, p2])
      await r.db(databaseName)
        .table(filesTable)
        .get(data.id)
        .update({ data: toWrite })
        .run()
    }
    else {
      await r.db(databaseName)
        .table(filesTable)
        .insert({ id: id, data: toWrite, inode: inode })
        .run()
    }
  }

  // Update node size
  let inodeItem = await r.db(databaseName)
    .table(nodeTable)
    .get(inode)
    .run()
  await r.db(databaseName)
    .table(nodeTable)
    .get(inode)
    .update({ size: Math.max(inodeItem.size, position + buffer.length) })
    .run()
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
  addDir,
  createFile,
  getNode,
  getNodeAttr,
  getFolder,
  readFile,
  debug,
  updateNode,
  write
}