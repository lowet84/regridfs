const databaseName = "regridfs";
const nodeTable = "inodes";
const miscTable = "misc";
const filesTable = "files";
var nodes = require("./nodes");

var r = null;

async function init(host, reset) {
  r = require("rethinkdbdash")({
    servers: [{ host: host }]
  });
  await initDb(reset);
  await nodes.setR(r);
  await addRootIfNeeded();
}

let initDb = async function(reset) {
  var dbs = await r.dbList().run();
  if (reset === true) {
    if (dbs.includes(databaseName)) {
      console.log("dropping db");
      await r.dbDrop(databaseName).run();
      dbs = [];
    }
  }
  if (!dbs.includes(databaseName)) {
    console.log("creating db");
    await r.dbCreate(databaseName).run();
    await r
      .db(databaseName)
      .tableCreate(nodeTable)
      .run();
    await r
      .db(databaseName)
      .tableCreate(miscTable)
      .run();
    await r
      .db(databaseName)
      .table(miscTable)
      .insert({ id: "nextInode", value: 0 });
    await r
      .db(databaseName)
      .tableCreate(filesTable)
      .run();
    await r
      .db(databaseName)
      .table(filesTable)
      .indexCreate("inode")
      .run();
  }
};

let getNextINode = async function() {
  let inode = await r
    .db(databaseName)
    .table(miscTable)
    .get("nextInode")
    .update({ value: r.row("value").add(1) }, { returnChanges: true })
    .run();
  let value = inode.changes[0].new_val.value;
  return value;
};

let addRootIfNeeded = async function() {
  var exists = await nodes.getNode(1);
  if (exists === null) {
    console.log("creating root folder");
    await nodes.addDir(await getNextINode(), -1, "root");
  }
};

let readFile = async function(inode, length, offset) {
  let files = await r
    .db(databaseName)
    .table(filesTable)
    .filter({ inode: inode })
    .pluck("id")
    .orderBy("id")
    .coerceTo("Array")
    .run();

  let dataLeft = length;
  let total = 0;
  let data = new Buffer(0);
  for (var index = 0; index < files.length; index++) {
    let file = files[index];
    if (total >= offset) {
      let temp = await r
        .db(databaseName)
        .table(filesTable)
        .get(file.id)
        .run();
      var start = Math.max(offset - total, 0);
      var end = Math.min(dataLeft, chunkSize);
      let selected = await temp.data.slice(start, end);
      data = Buffer.concat([data, selected]);
      dataLeft -= selected.length;
    }
    total += chunkSize;
    if (total > offset + length) {
      break;
    }
  }

  return { length: data.length, buffer: data };
};

let addDir = async function(inode, name) {
  let parent = await nodes.getNode(inode);
  let newId = await getNextINode();
  parent.nodes.push(newId);

  await nodes.addDir(newId, inode, name);
  await nodes.saveNode(parent);
  return newId;
};

let createFile = async function(inode, filename) {
  let folder = await nodes.getNode(inode);
  if (await nodes.fileExists(inode, filename)) {
    return null;
  }
  let newId = await getNextINode();
  folder.nodes.push(newId);
  await nodes.addFile(newId, inode, filename);
  await nodes.saveNode(folder);
  return newId;
};

let getNode = async function(inode) {
  return await nodes.getNode(inode);
};

let getFolder = async function(inode) {
  console.log(`test: ${inode}`);
  try {
    await nodes.removeCacheItem(inode);
    let folder = await nodes.getNode(inode);
    let subNodes = [];
    for (var index = 0; index < folder.nodes.length; index++) {
      var node = folder.nodes[index];
      subNodes.push(await nodes.getNode(node));
    }
    let parent = await nodes.getNode(folder.parent);
    folder.nodes = subNodes;
    folder.parent = parent;
    return folder;
  } catch (e) { 
    console.log(e)}
};

let updateNode = async function(inodeItem) {
  await nodes.saveNode(inodeItem);
};

let getNodeAttr = async function(item) {
  let mode = null;
  let size = null;
  let nlink = null;
  let inode = null;
  let created = null;
  let modified = null;
  if (item === null) {
    mode = 16895;
    size = 4096;
    nlink = 1;
    inode = 1;
    created = Date.now();
    modified = Date.now();
  } else {
    inode = item.id;
    created = item.created;
    modified = item.modified;
    mode = item.mode;

    if (!item.idDir) {
      size = item.size;
      nlink = 1;
    } else {
      size = 4096;
      nlink = 1 + item.nodes.length;
    }
  }
  let attr = {
    inode: inode,
    ctime: created,
    mtime: modified,
    mode: mode,
    size: size,
    nlink: nlink
  };
  return attr;
};

let chunkSize = 4096;
let write = async function(inode, buffer, position) {
  let firstPart = Math.floor(position / chunkSize);

  let part = firstPart;
  let dataLeft = buffer.length;
  // Handle first part
  let offset = position % chunkSize;
  if (offset > 0) {
    let toWrite = await buffer.slice(0, chunkSize - offset);
    let data = await r
      .db(databaseName)
      .table(filesTable)
      .get(`${inode}___${part}`)
      .run();
    if (data !== null) {
      let p1 = data.data.slice(0, offset);
      let p2 = data.data.slice(offset + toWrite.length, chunkSize);
      toWrite = await Buffer.concat([p1, toWrite, p2]);
      await r
        .db(databaseName)
        .table(filesTable)
        .get(data.id)
        .update({ data: toWrite })
        .run();
    } else {
      console.log("cannot write to new part unless from the beginning of file");
      return;
    }
    part++;
    dataLeft -= chunkSize - offset;
  }

  // Handle middle parts
  while (dataLeft >= chunkSize) {
    let id = `${inode}___${part}`;
    let toWrite = await buffer.slice(
      part * chunkSize - offset,
      part * chunkSize + chunkSize - offset
    );
    let existing = await r
      .db(databaseName)
      .table(filesTable)
      .get(id)
      .pluck("id")
      .default(null)
      .run();
    if (existing !== null) {
      await r
        .db(databaseName)
        .table(filesTable)
        .get(id)
        .update({ data: toWrite })
        .run();
    } else {
      await r
        .db(databaseName)
        .table(filesTable)
        .insert({ id: id, data: toWrite, inode: inode })
        .run();
    }
    part++;
    dataLeft -= chunkSize;
  }

  // Handle last part
  if (dataLeft > 0) {
    let id = `${inode}___${part}`;
    let toWrite = await buffer.slice(
      part * chunkSize - offset,
      part * chunkSize + dataLeft - offset
    );
    let data = await r
      .db(databaseName)
      .table(filesTable)
      .get(id)
      .run();
    if (data !== null) {
      let p2 = data.data.slice(offset + toWrite.length, chunkSize);
      toWrite = await Buffer.concat([toWrite, p2]);
      await r
        .db(databaseName)
        .table(filesTable)
        .get(data.id)
        .update({ data: toWrite })
        .run();
    } else {
      await r
        .db(databaseName)
        .table(filesTable)
        .insert({ id: id, data: toWrite, inode: inode })
        .run();
    }
  }

  // Update node size
  let inodeItem = await nodes.getNode(inode);
  if (isNaN(inodeItem.size)) {
    inodeItem.size = 0;
  }
  inodeItem.size = Math.max(inodeItem.size, position + buffer.length);
  await nodes.saveNode(inodeItem);
};

let debug = async function(name, values) {
  console.log(`====${name}====`);
  values.forEach(element => {
    console.log(JSON.stringify(element));
  }, this);
  console.log(`<><><><><><><><><>`);
};

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
};
