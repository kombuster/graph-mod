
module.exports = class EdgeBank {
  constructor(node){
    this.node = node;
    this._edgeCollection = node.collection.db.getCollection('edges');
    this.edges = [];
  }


  async loadEdges() {
    let edgeCollection = _edgeCollection;
    let edges = await edgeCollection.read({ start: this.signature });
    //this.links = {};
    //edges.forEach(e => this._addEdge(e));
    this.edges = edges.map(e => new Edge(this, e));
    for(let edge of this.edges) {
      
    }
  }
};