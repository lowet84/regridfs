"use strict";

const fusejs = require("fusejs"); //require('fusejs');
const ops = require("./fuseOperations");
const PosixError = fusejs.PosixError;

class RegridFS extends fusejs.FileSystem {
  // Handled
  async lookup(context, parentInode, name, reply) {
    common.debug("lookup", [context, parentInode, name, reply]);
    let result = await ops.lookup(context, parentInode, name, reply);
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async getattr(context, inode, reply) {
    try {
      common.debug("getattr", [context, inode, reply]);
      let result = await ops.getattr(context, inode, reply);
      console.log(reply.hasReplied);
      await handle(result, reply);
    } catch (e) {
      console.log(JSON.stringify(e))
    }
  }

  async readdir(context, inode, requestedSize, offset, fileInfo, reply) {
    common.debug("readdir", [
      context,
      inode,
      requestedSize,
      offset,
      fileInfo,
      reply
    ]);
    let result = await ops.readdir(
      context,
      inode,
      requestedSize,
      offset,
      fileInfo,
      reply
    );
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async open(context, inode, fileInfo, reply) {
    common.debug("open", [context, inode, fileInfo, reply]);
    let result = await ops.open(context, inode, fileInfo, reply);
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async read(context, inode, len, offset, fileInfo, reply) {
    common.debug("read", [context, inode, len, offset, fileInfo, reply]);
    let result = await ops.read(context, inode, len, offset, fileInfo, reply);
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async create(context, inode, filename, mode, fileInfo, reply) {
    common.debug("create", [context, inode, filename, mode, fileInfo, reply]);
    let result = await ops.create(
      context,
      inode,
      filename,
      mode,
      fileInfo,
      reply
    );
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async setattr(context, inode, options, reply) {
    common.debug("setattr", [context, inode, options, reply]);
    let result = await ops.setattr(context, inode, options, reply);
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async write(context, inode, buffer, position, fileInfo, reply) {
    common.debug("write", [context, inode, buffer, position, fileInfo, reply]);
    let result = await ops.write(
      context,
      inode,
      buffer,
      position,
      fileInfo,
      reply
    );
    console.log(reply.hasReplied);
    await handle(result, reply);
  }

  async mknod(a, b, c, d, e, f, g, h) {
    common.debug("mknod", [a, b, c, d, e, f, g, h]);
  }

  // Non-handled
  release(context, inode, fileInfo, reply) {
    reply.err(0);
  }

  releasedir(context, inode, fileInfo, reply) {
    reply.err(0);
  }

  opendir(context, inode, fileInfo, reply) {
    reply.open(fileInfo);
  }
}

var handle = async function(result, reply) {
  switch (result) {
    case 1:
      reply.err(PosixError.ENOENT);
      break;
    case 2:
      reply.err(PosixError.EISDIR);
      break;
    case 3:
      reply.err(PosixError.EEXIST);
      break;
  }
};

var common = require("./common");

async function init(host) {
  await common.init(host);
}

module.exports = { RegridFS, init };
