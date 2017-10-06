"use strict";

const fuse = require('fusejs').fuse;
const ExampleFS = require('./regridfs').ExampleFS;
const exec = require('child_process').exec;
const os = require('os');
const fs = require('fs');

console.log(process.argv.slice(2, process.argv.length));

const m = fuse.mount({
  filesystem: ExampleFS,
  options: ["ExampleFS"].concat(process.argv.slice(2, process.argv.length))
});