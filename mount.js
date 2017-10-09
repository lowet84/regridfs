"use strict";
const fuse = require('fusejs').fuse;
const regridfs = require('./regridfs');
const RegridFS = regridfs.RegridFS

let args = process.argv.slice(2, process.argv.length)
let host = args[0]
console.log(host)

async function start () {
  await regridfs.setHost(host)
  fuse.mount({
    filesystem: RegridFS,
    options: ["RegridFS"].concat(process.argv.slice(2, process.argv.length))
  });
}


start()
// const exec = require('child_process').exec;
// const os = require('os');
// const fs = require('fs');