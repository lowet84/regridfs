"use strict"

const fusejs = require('fusejs'); //require('fusejs');
const ops = require('./fuseOperations')
const PosixError = fusejs.PosixError;


class RegridFS extends fusejs.FileSystem {

  // Handled
  async lookup (context, parentInode, name, reply) {
    common.debug('lookup', [context, parentInode, name, reply])
    let result = await ops.lookup(context, parentInode, name, reply)
    await handle(result, reply)
  }

  async getattr (context, inode, reply) {
    common.debug('getattr', [context, inode, reply])
    let result = await ops.getattr(context, inode, reply)
    await handle(result, reply)
  }

  async readdir (context, inode, requestedSize, offset, fileInfo, reply) {
    common.debug('readdir', [context, inode, requestedSize, offset, fileInfo, reply])
    let result = await ops.readdir(context, inode, reply)
    await handle(result, reply)
  }

  async open (context, inode, fileInfo, reply) {
    common.debug('open', [context, inode, fileInfo, reply])
    let result = await ops.open(context, inode, fileInfo, reply)
    await handle(result, reply)
  }

  async read (context, inode, len, offset, fileInfo, reply) {
    common.debug('read', [context, inode, len, offset, fileInfo, reply])
    let result = await ops.read(context, inode, len, offset, fileInfo, reply)
    await handle(result, reply)
  }

  async create(context, inode, filename, mode, fileInfo, reply){
    common.debug('create', [context, inode, filename, mode, fileInfo, reply])
    let result = await ops.create(context, inode, filename, mode, fileInfo, reply)
    await handle(result, reply)
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

var handle = async function (result, reply){
  if(result === 1){
    reply.err(PosixError.ENOENT);
  }
  else if (result === 2) {
    reply.err(PosixError.EISDIR);
  }
}

var common = require('./common')

async function init (host) {
  await common.init(host)
}

module.exports = { RegridFS, init }