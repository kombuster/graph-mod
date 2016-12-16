module.exports = class Edge {
  constructor(node, data) {
    this.node = node;
    this.data = data;
    this.start = data.start;
    this.end = data.end;
    this.name = data.name;
  }

  async load(){
    if (!this.target) {
      const tuple = this.end.split('__');
      let collection = this.node.collection.db.getCollection(tuple[1]);
      this.target = await collection.readNode(tuple[0]);
    }
    return this.target;
  }
}
