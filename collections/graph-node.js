const Edge = require('./edge');
const assert = require('assert');

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



module.exports = class GraphNode {
  constructor(collection, key, data) {
    this.collection = collection;
    this.key = key;
    //this.signature = buildSignature(this.collection.name, this.key);
    this.data = data || {};
    this.edges = [];
  }


  withId(id) {
    this.id = id;
    return this;
  }

  get signature() {
    assert(this.id, 'node is not initialized');
    return `${this.id}__${this.collection.name}`;
  }


  sameAs(data) {
    return compare(data, this.data);
  }

  getEdgeCollection() {
    return this.collection.db.getCollection('edges');
  }

  async findEdges(edgePredicate, nodePredicate, results, previous){
    if (!results) {
      results = [];
    }
    const filteredEdges = this.edges.filter(edgePredicate);
    let filteredNodes = [];

    for(let edge of filteredEdges) {
      edge.previous = previous;
      
      await edge.load();
      const status = nodePredicate(edge.target, edge);
      if (status) {
        results.push(edge);
      } else {
        await edge.target.findEdges(edgePredicate, nodePredicate, results, edge);
      }
    }
    return results;
  }

  async loadEdges() {
    let edgeCollection = this.getEdgeCollection();
    let edges = await edgeCollection.read({ start: this.signature });
    this.edges = edges.map(e => new Edge(this, e));
  }

  findEdge(name, targetSignature){
    console.log({name, targetSignature});
    let edge = this.edges.find(e => e.end === targetSignature && e.name === name);
    return edge;
  }




  async connect(target, name, data) {
    let edge = this.edges.find(e => e.end === target.signature && e.name === name && compare(data, e.data));
    if (!edge) {
      //console.log('edge not found');
      let edgeCollection = this.getEdgeCollection();
      let record = Object.assign({ start: this.signature, end: target.signature, name }, data);
      await edgeCollection.insert(record);
      edge = new Edge(this, record);
      edge.target = target;
      this.edges.push(edge);
    }
    return edge;
  }

}
