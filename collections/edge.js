const assert = require('assert');
module.exports = class Edge {
  constructor(node, data) {
    this.node = node;
    this.data = data;
    this.start = data.start;
    this.end = data.end;
    this.name = data.name;
    assert(this.end, 'bad edge');
    const parsedSignature = Edge.parseSignature(this.end);
    this.targetCollectionName = parsedSignature.collectionName;
    this.targetId = parsedSignature.id;

  }

  static parseSignature(signature) {
    const tuple = signature.split('__');
    const collectionName = tuple[1];
    const id = tuple[0];
    return { collectionName, id };    
  }

  async load(){
    if (!this.target) {
      let collection = this.node.collection.db.getCollection(this.targetCollectionName);
      this.target = await collection.readNode(this.targetId);
    }
    return this.target;
  }
}
