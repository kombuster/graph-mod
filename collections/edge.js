module.exports = class Edge {
  constructor(node, data) {
    this.node = node;
    this.data = data;
    this.start = data.start;
    this.end = data.end;
  }

  async load(){
    if (!this.target) {
      let collection = this.node.collection.db.getCollection(this.end.collection);
      this.target = await collection.readNode(this.end.key);
    }
    return this.target;
  }
}
