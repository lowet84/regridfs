"use strict"

const fusejs = require('fusejs'); //require('fusejs');
const ops = require('./fuseOperations')
const PosixError = fusejs.PosixError;


class RegridFS extends fusejs.FileSystem {

  // Handled
  async lookup (context, parentInode, name, reply) {
    let time = Date.getTime()
    // common.debug('lookup', [context, parentInode, name, reply])
    let result = await ops.lookup(context, parentInode, name, reply)
    // common.debug('lookup result', [result])
    await handle(result, reply)
    console.log(`lookup: ${Date.getTime() - time}`)
  }

  async getattr (context, inode, reply) {
    let time = Date.getTime()
    // common.debug('getattr', [context, inode, reply])
    let result = await ops.getattr(context, inode, reply)
    await handle(result, reply)
    console.log(`getattr: ${Date.getTime() - time}`)
  }

  async readdir (context, inode, requestedSize, offset, fileInfo, reply) {
    let time = Date.getTime()
    // common.debug('readdir', [context, inode, requestedSize, offset, fileInfo, reply])
    let result = await ops.readdir(context, inode, requestedSize, offset, fileInfo, reply)
    await handle(result, reply)
    console.log(`readdir: ${Date.getTime() - time}`)
  }

  async open (context, inode, fileInfo, reply) {
    let time = Date.getTime()
    // common.debug('open', [context, inode, fileInfo, reply])
    let result = await ops.open(context, inode, fileInfo, reply)
    await handle(result, reply)
    console.log(`open: ${Date.getTime() - time}`)
  }

  async read (context, inode, len, offset, fileInfo, reply) {
    let time = Date.getTime()
    // common.debug('read', [context, inode, len, offset, fileInfo, reply])
    let result = await ops.read(context, inode, len, offset, fileInfo, reply)
    await handle(result, reply)
    console.log(`read: ${Date.getTime() - time}`)
  }

  async create (context, inode, filename, mode, fileInfo, reply) {
    let time = Date.getTime()
    // common.debug('create', [context, inode, filename, mode, fileInfo, reply])
    let result = await ops.create(context, inode, filename, mode, fileInfo, reply)
    await handle(result, reply)
    console.log(`create: ${Date.getTime() - time}`)
  }

  async setattr (context, inode, options, reply) {
    let time = Date.getTime()
    // common.debug('setattr', [context, inode, options, reply])
    let result = await ops.setattr(context, inode, options, reply)
    await handle(result, reply)
    console.log(`setattr: ${Date.getTime() - time}`)
  }

  async write (context, inode, buffer, position, fileInfo, reply) {
    let time = Date.getTime()
    // common.debug('write', [context, inode, buffer, position, fileInfo, reply])
    let result = await ops.write(context, inode, buffer, position, fileInfo, reply)
    await handle(result, reply)
    console.log(`write: ${Date.getTime() - time}`)
  }

  async mknod (a, b, c, d, e, f, g, h) {
    common.debug('mknod', [a, b, c, d, e, f, g, h])
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

var handle = async function (result, reply) {
  switch (result) {
    case 1:
      reply.err(PosixError.ENOENT)
      break
    case 2:
      reply.err(PosixError.EISDIR)
      break
    case 3:
      reply.err(PosixError.EEXIST)
      break
  }
}

var common = require('./common')

async function init (host) {
  await common.init(host)
}

module.exports = { RegridFS, init }