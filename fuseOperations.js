var common = require('./common')

let lookup = async function (context, parentInode, name, reply) {
  let parentItem = await common.getFolder(parentInode)
  if (parentItem === null || parentItem === undefined) {
    return 1
  }
  var item = await parentItem.nodes.find(d => d.name === name)
  if (item === null || item === undefined) {
    return 1
  }
  let inodeItem = await common.getNode(item.id)
  if (inodeItem === null || inodeItem === undefined) {
    return 1
  }
  let attr = await common.getNodeAttr(inodeItem)
  const entry = {
    inode: item.id,
    attr: attr,
    generation: 1
  }
  reply.entry(entry);
  return 0
}

module.exports = { 
  lookup 
}