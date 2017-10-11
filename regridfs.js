/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 This example has 3 inodes ( /hello/world.txt ).
 1: the root inode is always the first
 2: a folder.
 3: a file.
*/
"use strict";
// const now = Date.now();

// const root = {
//   inode: 1,
//   ctime: now,
//   mtime: now,
//   mode: 16895,//0o40777
//   size: 4096, //standard size of a folder
//   nlink: 2 //itself counts as one and the folder
// }

// const folder = {
//   inode: 2,
//   ctime: now,
//   mtime: now,
//   mode: 16895,//0o40777
//   size: 4096, //standard size of a folder
//   nlink: 2 //itself counts as one and the file 
// }

var file_content = "hello world";
// const file = {
//   inode: 3,
//   ctime: now,
//   mtime: now,
//   mode: 33279,//0o100777
//   size: file_content.length, //standard size of a folder
//   nlink: 1 //a file only has one link
// }

const fusejs = require('fusejs'); //require('fusejs');
// const FileSystem = fusejs.FileSystem;
const PosixError = fusejs.PosixError;


class RegridFS extends fusejs.FileSystem {

	/* 
	the context object contains 4 fields:
		uid: user id
		gid: group id
		pid: process id
		umask: Umask of the calling process (only available for fuse version 2.8 and higher)
	*/

  /* lookup, getattr, releasedir, opendir, readdir are the minimum functions that need to be implemented for listing directories */
  async lookup (context, parentInode, name, reply) {
    common.debug('lookup', [context, parentInode, name, reply])
    let parentItem = await common.getFolder(parentInode)
    if (parentItem === null) {
      reply.err(PosixError.ENOTENT);
      return
    }
    var item = await parentItem.nodes.find(d => d.name === name)
    if (item === undefined) {
      reply.err(PosixError.ENOTENT);
      return
    }
    let inodeItem = await common.getNode(item.id)
    if (inodeItem === null) {
      reply.err(PosixError.ENOTENT);
      return
    }
    let attr = await common.getNodeAttr(inodeItem)
    const entry = {
      inode: item.id,
      attr: attr,
      generation: 1
    }
    reply.entry(entry);
  }

  async getattr (context, inode, reply) {
    common.debug('getattr', [context, inode, reply])
    //Get file attributes
    //http://fuse.sourceforge.net/doxygen/structfuse__lowlevel__ops.html#a994c316fa7a1ca33525a4540675f6b47

    let inodeItem = await common.getNode(inode)
    if (inodeItem === null) {
      reply.err(PosixError.ENOTENT);
      return
    }

    let attr = await common.getNodeAttr(inodeItem)
    reply.attr(attr, 3600);
    return;
  }

  releasedir (context, inode, fileInfo, reply) {
    reply.err(0);
  }

  opendir (context, inode, fileInfo, reply) {
    reply.open(fileInfo);
  }


  async readdir (context, inode, requestedSize, offset, fileInfo, reply) {
    common.debug('getattr', [context, inode, requestedSize, offset, fileInfo, reply])
    //http://fuse.sourceforge.net/doxygen/structfuse__lowlevel__ops.html#af1ef8e59e0cb0b02dc0e406898aeaa51

		/*
		Read directory
		Send a buffer filled using reply.addDirEntry. Send an empty buffer on end of stream.
		fileInfo.fh will contain the value set by the opendir method, or will be undefined if the opendir method didn't set any value.
		Returning a directory entry from readdir() does not affect its lookup count.
		Valid replies: reply.addDirEntry reply.buffer, reply.err
		*/

		/*
		size is the maximum memory size of the buffer for the underlying fuse
		filesystem. currently this cannot be determined a priori
		*/

    // const size = Math.max( requestedSize , children.length * 256);

    let inodeItem = await common.getFolder(inode)
    if (inodeItem === null) {
      reply.err(PosixError.ENOTENT);
      return
    }

    const size = Math.max(requestedSize, inodeItem.nodes.length * 256);
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
    if (inodeItem === null) {
      reply.err(PosixError.ENOTENT);
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
      reply.err(PosixError.ENOTENT);
      return
    }

    const length = inodeItem.size
    const content = await common.readFile(inodeItem.fileId, Math.min(length, offset + len), offset)
    reply.buffer(new Buffer(content), content.length);
    return;
  }

  release (context, inode, fileInfo, reply) {
    reply.err(0);
  }
}

var common = require('./common')

async function init (host) {
  await common.init(host)
}

module.exports = { RegridFS, init }