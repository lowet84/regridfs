const databaseName = "regridfs";
const nodeTable = "inodes";
const cacheLifeMinutes = 2;

let r = null;

let cache = {};

let setR = async function(value) {
  r = value;
};

let getNode = async function(inode) {
  console.log("getNode1");
  let cachedItem = cache[`i${inode}`];
  console.log("getNode2");
  if (cachedItem !== null && cachedItem !== undefined) {
    console.log("getNode3");
    let currentTime = await now();
    console.log("getNode4");
    if (currentTime + cacheLifeMinutes * 60 * 1000 > cachedItem.time) {
      console.log("getNode5");
      return cachedItem.value;
    }
  }

  console.log("getNode6");
  let ret = await r
    .db(databaseName)
    .table(nodeTable)
    .get(inode)
    .run();
  console.log("getNode7");
  cache[`i${inode}`] = { value: clone(ret), time: await now() };
  console.log("getNode8");
  return ret;
};

let clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

let addDir = async function(inode, parent, name) {
  await r
    .db(databaseName)
    .table(nodeTable)
    .insert({
      isDir: true,
      nodes: [],
      name: name,
      id: inode,
      created: await now(),
      modified: await now(),
      parent: parent,
      mode: 16895
    });
  removeCacheItem(inode);
};

let addFile = async function(inode, parent, filename) {
  await r
    .db(databaseName)
    .table(nodeTable)
    .insert({
      isDir: false,
      id: inode,
      name: filename,
      created: await now(),
      modified: await now(),
      size: 0,
      parent: parent,
      mode: 33279
    });
  removeCacheItem(inode);
};

let fileExists = async function(inode, filename) {
  var exists = await r
    .db(databaseName)
    .table(nodeTable)
    .filter({ name: filename, parent: inode });
  if (exists.length > 0) {
    return true;
  }
  return false;
};

let now = async function() {
  console.log("now1");
  let ret = new Date().getTime();
  console.log("now2");
  return ret;
};

let saveNode = async function(inodeItem) {
  await r
    .db(databaseName)
    .table(nodeTable)
    .replace(inodeItem)
    .run();

  removeCacheItem(inodeItem.id);
};

let removeCacheItem = async function(inode) {
  cache[`i${inode}`] = undefined;
};

module.exports = {
  setR,
  getNode,
  addDir,
  saveNode,
  fileExists,
  addFile,
  now,
  removeCacheItem
};
