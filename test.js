"use strict";

let common = require("./common");
let ops = require("./fuseOperations");

let start = async function() {
  await common.init("localhost", true);
  let somedirId = await common.addDir(1, "somedir");
  await common.createFile(somedirId, "test1.txt", 33152);
  await common.createFile(somedirId, "test1.txt", 33152);
  await common.createFile(somedirId, "test2.txt", 33152);
  await common.getFolder(1);
  await debugLookup();
  await debugCreate();
  await debugReadEmptyFile();
  await debugSetattr(4);
  await debugWrite(4, 0, await getTestData(10));
  await debugWrite(4, 5, await getTestData(200));
  await debugWrite(3, 0, await getTestTextData());
  await debugRead(3);
  await debugReadDir(1);
  await debugGetAttr();
  console.log("done");
};

let debugGetAttr = async function() {
  let reply = getReply()
  await ops.getattr(null, 1, reply);
  reply.validate();
};

let debugLookup = async function() {
  let reply = getReply()
  await ops.lookup(null, 1, "somedir", reply);
  reply.validate();
};

let getTestTextData = async function() {
  let data =
    "RethinkDB write operations will only throw exceptions if errors occur before any writes. Other errors will be listed in first_error, and errors will be set to a non-zero count. To properly handle errors with this term, code must both handle exceptions and check the errors return value!";
  var buffer = Buffer.from(data, "utf8");
  return buffer;
};

let getReply = function() {
  return {
    finished: false,
    hasReplied: false,
    entry: function(value) {
      this.finished = true
    },
    buffer: function(value) {
      this.finished = true
    },
    create: function(value) {
      this.finished = true
    },
    attr: function(value) {
      this.finished = true
    },
    write: function(value) {
      this.finished = true
    },
    addDirEntry: function(value) {
      this.finished = true
    },
    validate: function(){
      if(!this.finished){
        throw "NOT DONE!!!"
      }
    }
  };
};

let getTestData = async function(length) {
  var data = Array.apply(null, { length: 3000 })
    .map(Number.call, Number)
    .join("");
  var buffer = Buffer.from(data, "utf8").slice(0, length);
  return buffer;
};

let debugRead = async function(inode) {
  let reply = getReply()
  await ops.read(null, inode, 4096, 0, null, reply);
  reply.validate();
};

let debugReadDir = async function(inode) {
  let reply = getReply()
  await ops.readdir(null, inode, 4096, 0, null, reply)
  reply.validate()
};

let debugWrite = async function(inode, offset, buffer) {
  let reply = getReply()
  await ops.write(null, inode, buffer, offset, null, reply)
  reply.validate()
};

let debugCreate = async function() {
  let context = { uid: 0, gid: 0, pid: 10089, umask: 18 };
  let inode = 1;
  let filename = "testfil";
  let mode = 33188;
  let fileInfo = {
    lock_owner: 0,
    file_handle: 0,
    nonseekable: false,
    flush: false,
    keep_cache: false,
    direct_io: false,
    writepage: false,
    flags: {
      rdonly: false,
      wronly: true,
      rdwr: false,
      nonblock: true,
      append: false,
      creat: true,
      trunc: false,
      excl: false,
      nofollow: false
    }
  };

  let reply = getReply()
  await ops.create(context, inode, filename, mode, fileInfo, reply)
  reply.validate();
};

let debugReadEmptyFile = async function(){
  let reply = getReply()
  await ops.read(null, 5, 4096, 0, null, reply);
  reply.validate();
}

let debugSetattr = async function(inode) {
  let options = { atime: -1, mtime: -1 }
  let reply = getReply()
  await ops.setattr(null, inode, options, reply)
  reply.validate();
};

start();
