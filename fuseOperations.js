var common = require('./common')

let lookup = async function (context, parentInode, name, reply) {
  let parentItem = await common.getFolder(parentInode)
  if (parentItem === null || parentItem === undefined) {
    return 1
  }
  var item = await parentItem.nodes.find(d => d.name === name)
  if (item === null || item === undefined) {
    return 1
  }
  let inodeItem = await common.getNode(item.id)
  if (inodeItem === null || inodeItem === undefined) {
    return 1
  }
  let attr = await common.getNodeAttr(inodeItem)
  let entry = await getEntry(item.id, attr)
  reply.entry(entry);
  return 0
}

let readdir = async function (context, inode, requestedSize, offset, fileInfo, reply) {
  let inodeItem = await common.getFolder(inode)
  if (inodeItem === null) {
    return 1
  }

  const size = Math.max(requestedSize, inodeItem.nodes.length * 256);

  let thisAttr = await common.getNodeAttr(inodeItem)
  reply.addDirEntry('.', size, thisAttr, offset)

  let parentAttr = await common.getNodeAttr(inodeItem.parent)
  reply.addDirEntry('..', size, parentAttr, offset)

  for (var index = 0; index < inodeItem.nodes.length; index++) {
    var child = inodeItem.nodes[index]
    let attr = await common.getNodeAttr(child)
    reply.addDirEntry(child.name, size, attr, offset)
  }

  reply.buffer(new Buffer(0), requestedSize);
  return 0
}

let getattr = async function (context, inode, reply) {
  let inodeItem = await common.getNode(inode)
  if (inodeItem === null) {
    return 1
  }

  let attr = await common.getNodeAttr(inodeItem)
  reply.attr(attr, 3600);
  return 0;
}

let open = async function (context, inode, fileInfo, reply) {
  let inodeItem = await common.getNode(inode)
  if (inodeItem === null || inodeItem === undefined) {
    return 1
  }
  if (inodeItem.fileId === undefined) {
    return 2
  }
  reply.open(fileInfo);
  return 0
}

let read = async function (context, inode, len, offset, fileInfo, reply) {
  common.debug('read', [context, inode, len, offset, fileInfo, reply])
  let inodeItem = await common.getNode(inode)
  if (inodeItem === null) {
    return 1
  }

  const length = inodeItem.size
  const content = await common.readFile(inodeItem.fileId, Math.min(length, offset + len), offset)
  reply.buffer(content.buffer, content.length);
  return 0
}

let create = async function (context, inode, filename, mode, fileInfo, reply) {
  let fileBuffer = Buffer.from('', 'utf8');
  let file = { filename: filename, buffer: fileBuffer }
  let result = await common.addFile(inode, file)
  fileInfo.file_handle = 0
  if (result === null) {
    return 3
  }
  let attr = await common.getNodeAttr(result)
  var entry = await getEntry(result.id, attr)
  inspect(reply)
  inspect(entry)
  reply.create( attr, fileInfo );
}

let inspect = async function (obj) {
  var result = []
  do {
    result.push(...Object.getOwnPropertyNames(obj))
  } while ((obj = Object.getPrototypeOf(obj)))

  console.log(result)
}

let getEntry = async function (inode, attr) {
  return {
    inode: inode,
    attr: attr,
    generation: 1
  }
}

module.exports = {
  lookup,
  getattr,
  readdir,
  open,
  read,
  create
}