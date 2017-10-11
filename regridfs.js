"use strict"

const fusejs = require('fusejs'); //require('fusejs');
const ops = require('./fuseOperations')
const PosixError = fusejs.PosixError;


class RegridFS extends fusejs.FileSystem {

  // Handled
  async lookup (context, parentInode, name, reply) {
    common.debug('lookup', [context, parentInode, name, reply])
    let result = await ops.lookup(context, parentInode, name, reply)
    if(result === 1){
      reply.err(PosixError.ENOENT);
    }
  }

  async getattr (context, inode, reply) {
    common.debug('getattr', [context, inode, reply])
    let result = await ops.getattr(context, inode, reply)
    if(result === 1){
      reply.err(PosixError.ENOENT);
    }
  }

  


  async readdir (context, inode, requestedSize, offset, fileInfo, reply) {
    common.debug('readdir', [context, inode, requestedSize, offset, fileInfo, reply])
 
    let inodeItem = await common.getFolder(inode)
    if (inodeItem === null) {
      reply.err(PosixError.ENOENT);
      return
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
  }

  async open (context, inode, fileInfo, reply) {
    common.debug('open', [context, inode, fileInfo, reply])
    let inodeItem = await common.getNode(inode)
    if (inodeItem === null || inodeItem === undefined) {
      reply.err(PosixError.ENOENT);
      return
    }
    if (inodeItem.fileId === undefined) {
      reply.err(PosixError.EISDIR);
      return;
    }
    reply.open(fileInfo);
    return;
  }

  async read (context, inode, len, offset, fileInfo, reply) {
    common.debug('read', [context, inode, len, offset, fileInfo, reply])
    let inodeItem = await common.getNode(inode)
    if (inodeItem === null) {
      reply.err(PosixError.ENOENT);
      return
    }

    const length = inodeItem.size
    const content = await common.readFile(inodeItem.fileId, Math.min(length, offset + len), offset)
    reply.buffer(content.buffer, content.length);
    return;
  }

  async create(context, inode, filename, mode, e, f, g, h){
    common.debug('create', [context, inode, filename, mode, e, f, g, h])
  }

  async write(a, b, c, d, e, f, g, h){
    common.debug('write', [a, b, c, d, e, f, g, h])
  }

  // Non-handled
  release (context, inode, fileInfo, reply) {
    reply.err(0);
  }

  releasedir (context, inode, fileInfo, reply) {
    reply.err(0);
  }

  opendir (context, inode, fileInfo, reply) {
    reply.open(fileInfo);
  }

  
}

var common = require('./common')

async function init (host) {
  await common.init(host)
}

module.exports = { RegridFS, init }