module.exports = class Edge {
  constructor(node, data) {
    this.node = node;
    this.data = data;
    this.start = data.start;
    this.end = data.end;
    this.name = data.name;
    const tuple = this.end.split('__');
    this.targetCollectionName = tuple[1];
    this.targetId = tuple[0];

  }

  async load(){
    if (!this.target) {
      let collection = this.node.collection.db.getCollection(this.targetCollectionName);
      this.target = await collection.readNode(this.targetId);
    }
    return this.target;
  }
}
