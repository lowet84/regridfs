const databaseName = "regridfs";
const nodeTable = "inodes";
const cacheLifeMinutes = 2;

let r = null;

let cache = {};

let setR = async function(value) {
  r = value;
};

let getNode = async function(inode) {
  let cachedItem = cache[`i${inode}`];
  if (cachedItem !== null && cachedItem !== undefined) {
    let currentTime = now();
    if (currentTime + cacheLifeMinutes * 60 * 1000 > cachedItem.time) {
      await dummy();
      return cachedItem.value;
    }
  }

  let ret = await r
    .db(databaseName)
    .table(nodeTable)
    .get(inode)
    .run();
  cache[`i${inode}`] = { value: clone(ret), time: now() };
  return ret;
};

let dummy = function() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
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
      created: now(),
      modified: now(),
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
      created: now(),
      modified: now(),
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

let now = function() {
  let ret = new Date().getTime();
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

let removeCacheItem = function(inode) {
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
