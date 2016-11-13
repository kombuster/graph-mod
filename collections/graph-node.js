const Edge = require('./edge');

function compareData(a, b) {
  for(let key in a) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function buildSignature(prefix, key) {
  return prefix + Object.keys(key).map(k=>`_${k}_${key[k]}`).join('_');
}

class GraphNode {
  constructor(collection, key, data) {
    this.collection = collection;
    this.key = key;
    this.signature = buildSignature(this.collection.name, this.key);
    this.data = data || {};
    this.edges = [];
  }

  

  sameAs(data) {
    return compareData(data, this.data);
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
    let edge = this.edges.find(e => e.end === target.signature && compareData(data, e.data));
    if (!edge) {
      let edgeCollection = this.getEdgeCollection();
      let record = Object.assign({ start: this.signature, end: target.signature }, data);
      await edgeCollection.insert(record);
      edge = new Edge(this, record);
      this.edges.push(edge);
    } else {
      console.log('edge is already found');
    }
    return edge;
  }

}

module.exports = GraphNode;