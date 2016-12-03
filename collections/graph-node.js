const Edge = require('./edge');

function compare(a, b) {
  for(let key in a) {
    if ( typeof a[key] === 'object') {
      //console.log('nested compare', a[key], b[key]);
      if (!compare(a[key], b[key])) {
        return false;
      }
    } else if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function buildSignature(collection, key) {
  return { collection, key };
}

module.exports = class GraphNode {
  constructor(collection, key, data) {
    this.collection = collection;
    this.key = key;
    this.signature = buildSignature(this.collection.name, this.key);
    this.data = data || {};
    this.edges = [];
  }



  sameAs(data) {
    return compare(data, this.data);
  }

  getEdgeCollection() {
    return this.collection.db.getCollection('edges');
  }

  async loadEdges() {
    let edgeCollection = this.getEdgeCollection();
    let edges = await edgeCollection.read({ start: this.signature });
    this.edges = edges.map(e => new Edge(this, e));
  }

  async connect(target, data) {
    // if (this.edges.length) {
    //   console.log(compare(target.signature, this.edges[0].end));
    // }
    let edge = this.edges.find(e => compare(e.end, target.signature) && compare(data, e.data));
    if (!edge) {
      //console.log('edge not found');
      let edgeCollection = this.getEdgeCollection();
      let record = Object.assign({ start: this.signature, end: target.signature }, data);
      await edgeCollection.insert(record);
      edge = new Edge(this, record);
      edge.target = target;
      this.edges.push(edge);
    }
    return edge;
  }

}
