"use strict";

const databaseName = 'regridfs'

let initDb = async function () {
  var dbs = await r.dbList().run()
  if (!dbs.includes(databaseName)) {
    console.log('creating db')
    r.dbCreate(databaseName).run()
  }
}

let start = async function () {
  await initDb()
  const ReGrid = require('rethinkdb-regrid');
  var bucket = ReGrid({ db: databaseName }, { bucketName: 'mybucket' })
  bucket.initBucket()

  fuse.mount({
    filesystem: RegridFS,
    options: ["RegridFS"].concat(process.argv.slice(2, process.argv.length))
  });
}


const fuse = require('fusejs').fuse;
const RegridFS = require('./regridfs').RegridFS;

let args = process.argv.slice(2, process.argv.length)
let host = args[0]
console.log(host)
var r = require('rethinkdbdash')({
  servers: [
    { host: host }
  ]
})

// const exec = require('child_process').exec;
// const os = require('os');
// const fs = require('fs');

start()