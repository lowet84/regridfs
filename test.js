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

  var exists = await bucket.listFilename('/temp/test.txt').toArray()
  if (exists.length === 0) {
    var fileBuffer = Buffer.from("TEST!!!", 'utf8');
    console.log(fileBuffer)
    let newFile = await bucket.writeFile({ filename: '/temp/test.txt', buffer: fileBuffer })
    console.log(newFile)
  }
}

var r = require('rethinkdbdash')()

start()