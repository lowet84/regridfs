"use strict";
const fuse = require('fusejs').fuse;
const regridfs = require('./regridfs');
const RegridFS = regridfs.RegridFS

let args = process.argv.slice(2, process.argv.length)
let host = args[0]
console.log(host)

async function start () {
  await regridfs.init(host)
  fuse.mount({
    filesystem: RegridFS,
    options: ["RegridFS"].concat(process.argv.slice(3, process.argv.length))
  });
}


start()