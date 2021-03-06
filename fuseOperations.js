var common = require("./common");

let lookup = async function(context, parentInode, name, reply) {
  let parentItem = await common.getFolder(parentInode);
  if (parentItem === null || parentItem === undefined) {
    return 1;
  }
  var item = await parentItem.nodes.find(d => d.name === name);
  if (item === null || item === undefined) {
    return 1;
  }
  let inodeItem = await common.getNode(item.id);
  if (inodeItem === null || inodeItem === undefined) {
    return 1;
  }
  let attr = await common.getNodeAttr(inodeItem);
  let entry = await getEntry(item.id, attr);
  reply.entry(entry);
  return 0;
};

let readdir = async function(
  context,
  inode,
  requestedSize,
  offset,
  fileInfo,
  reply
) {
  let inodeItem = await common.getFolder(inode);
  if (inodeItem === null) {
    return 1;
  }

  const size = Math.max(requestedSize, inodeItem.nodes.length * 256);

  let thisAttr = await common.getNodeAttr(inodeItem);
  reply.addDirEntry(".", size, thisAttr, offset);

  let parentAttr = await common.getNodeAttr(inodeItem.parent);
  reply.addDirEntry("..", size, parentAttr, offset);

  for (var index = 0; index < inodeItem.nodes.length; index++) {
    var child = inodeItem.nodes[index];
    let attr = await common.getNodeAttr(child);
    reply.addDirEntry(child.name, size, attr, offset);
  }

  reply.buffer(new Buffer(0), requestedSize);
  return 0;
};

let getattr = async function(context, inode, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null) {
    return 1;
  }

  let attr = await common.getNodeAttr(inodeItem);
  reply.attr(attr, 3600);
  return 0;
};

let open = async function(context, inode, fileInfo, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null || inodeItem === undefined) {
    return 1;
  }
  if (inodeItem.isDir) {
    return 2;
  }
  reply.open(fileInfo);
  return 0;
};

let read = async function(context, inode, len, offset, fileInfo, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null) {
    return 1;
  }

  const length = inodeItem.size;
  const content = await common.readFile(
    inodeItem.id,
    Math.min(length, offset + len),
    offset
  );
  reply.buffer(content.buffer, content.length);
  return 0;
};

let create = async function(context, inode, filename, mode, fileInfo, reply) {
  let result = await common.createFile(inode, filename, mode);
  fileInfo.file_handle = 0;
  if (result === null) {
    return 3;
  }
  let attr = await common.getNodeAttr(result);
  let entry = await getEntry(result, attr);
  reply.create(entry, fileInfo);
};

let setattr = async function(context, inode, options, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null) {
    return 1;
  }

  if (options.hasOwnProperty("mtime")) {
    const m = new Date(options.mtime);
    inodeItem.modified = m.getTime();
  }

  if (options.hasOwnProperty("size")) {
    inodeItem.size = options.size;
  }

  if (options.hasOwnProperty("mode")) {
    inodeItem.mode = options.mode;
  }
  await common.updateNode(inodeItem);
  let attr = await common.getNodeAttr(inodeItem);
  reply.attr(attr, 5);
};

let write = async function(context, inode, buffer, position, fileInfo, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null) {
    return 1;
  }

  await common.write(inode, buffer, position);
  inodeItem.size = Math.max(buffer.length + position, inodeItem.size);

  await common.updateNode(inodeItem);
  reply.write(buffer.length);
};

let getEntry = async function(inode, attr) {
  return {
    inode: inode,
    attr: attr,
    generation: 1
  };
};

let access = async function(context, inode, mask, reply) {
  let inodeItem = await common.getNode(inode);
  if (inodeItem === null) {
    return 1;
  }

  reply.err(0);
  return 0;
};

let unlink = async function(context, parentInode, name, reply) {
  let parentItem = await common.getFolder(parentInode);
  if (parentItem === null || parentItem === undefined) {
    return 1;
  }
  var item = await parentItem.nodes.find(d => d.name === name);
  if (item === null || item === undefined) {
    return 1;
  }
  
  common.deleteFile(item.id, parentInode)

  reply.err(0);
  return 0;
}

module.exports = {
  lookup,
  getattr,
  readdir,
  open,
  read,
  create,
  setattr,
  write,
  access,
  unlink
};
