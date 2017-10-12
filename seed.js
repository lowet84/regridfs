'use strict';

let common = require('./common')
let ops = require('./fuseOperations')

let start = async function () {
  await common.init('localhost', true)
  let somedirId = await common.addDir(1, 'somedir')
  await common.addFile(somedirId, await getTestFile(1))
  await common.addFile(somedirId, await getTestFile(1))
  await common.addFile(somedirId, await getTestFile(2))
  await common.addFile(somedirId, await getTestFile(3))
  await common.addFile(somedirId, await getTestFile(4))
  await common.addFile(somedirId, await getTestFile(5))
  await common.addFile(somedirId, await getTestFile(6))
  await common.addFile(somedirId, await getTestFile(7))
  console.log(JSON.stringify(await common.getFolder(1)))
  await debugLookup()
  await debugCreate()
  await debugRead(3)
  await debugRead(10)
  console.log('done')
}

let getTestFile = async function (number) {
  var fileBuffer = Buffer.from(`A${number}`, 'utf8');
  return { filename: `test${number}.txt`, buffer: fileBuffer }
}

let debugLookup = async function () {
  await ops.lookup(null, 1, 'somedir', reply)
}

let reply = {
  "hasReplied": false,
  entry: function (value) {
    let json = JSON.stringify(value)
    console.log(`reply: ${json}`)
  },
  buffer: function (value) {
    let json = JSON.stringify(value)
    console.log(`buffer: ${json}`)
  },
  create: function (value) {
    let json = JSON.stringify(value)
    console.log(`create: ${json}`)
  }
}

let debugRead = async function (inode) {
  await ops.read(null, inode, 4096, 0, null, reply)
}

let debugCreate = async function () {
  let context = { 'uid': 0, 'gid': 0, 'pid': 10089, 'umask': 18 }
  let inode = 1
  let filename = 'testfil'
  let mode = 33188
  let fileInfo = {
    "lock_owner": 0,
    "file_handle": 0,
    "nonseekable": false,
    "flush": false,
    "keep_cache": false,
    "direct_io": false,
    "writepage": false,
    "flags": {
      "rdonly": false,
      "wronly": true,
      "rdwr": false,
      "nonblock": true,
      "append": false,
      "creat": true,
      "trunc": false,
      "excl": false,
      "nofollow": false
    }
  }


  await ops.create(context, inode, filename, mode, fileInfo, reply)
}

start()