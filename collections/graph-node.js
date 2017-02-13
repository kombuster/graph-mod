const Edge = require('./edge');
const assert = require('assert');
const EdgeBank = require('./edge-bank');

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
    this.data = data || {};
    this.out = {};
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



  async findEdges(query, collector, previous){
    if (!collector) {
      collector = { 
        results:[]
      };
      query.edgePredicate = query.edgePredicate || (e => true);
      query.costFunction = query.costFunction || (e => 1);
    }
    //console.log(this.edges.length);
    const filteredEdges = this.edges.filter(query.edgePredicate);
    //console.log(filteredEdges.length);    
    for(let edge of filteredEdges) {
      edge.previous = previous;
      
      await edge.load();
      //console.log('checking ', edge.target.key.name);
      const status = query.nodePredicate(edge.target, edge);
      if (status) {
        //console.log('pushing edge');
        collector.results.push(edge);
      } else {
        await edge.target.findEdges(query, collector, edge);
      }
    }
    return collector.results;
  }

  async backtrackOne(name) {
    let nodes = await this.backtrack(name);
    return nodes[0];
  }

  getEdgeCollection() {
    return this.collection.db.getCollection('edges');
  }

  async backtrack(name) {
    const edgeCollection = this.getEdgeCollection();
    const edges = await edgeCollection.read({ end: this.signature, name});
    let nodes = [];
    for(let edge of edges) {
      let signature = Edge.parseSignature(edge.start);
      let collection = this.collection.db.getCollection(signature.collectionName);
      let node = await collection.readNode(signature.id);
      nodes.push(node);
    }
    return nodes;
  }

  async loadEdges() {
    let edgeCollection = this.getEdgeCollection();
    let edges = await edgeCollection.read({ start: this.signature });
    //this.links = {};
    //edges.forEach(e => this._addEdge(e));
    this.edges = edges.map(e => new Edge(this, e));
  }



  getEdge(name, targetSignature){
    //console.log({name, targetSignature});
    let edge =  targetSignature ? 
      this.edges.find(e => e.end === targetSignature && e.name === name) : 
      this.edges.find(e => e.name === name);
    if (!edge) {
      console.log(this.edges);
    }
    return edge;
  }


  // // _addEdge(edgeData){
  // //   const edge = new Edge(this, edgeData);
  // //   this.edges.push(edge);
  // // }


  async connect(target, name, data) {
    assert(this != target, 'can not connect to itself');
    let edge = this.edges.find(e => e.end === target.signature && e.name === name && compare(data, e.data));
    if (!edge) {
      //console.log('edge not found');
      let edgeCollection = this.getEdgeCollection();
      let record = Object.assign({ start: this.signature, end: target.signature, name }, data);
      await edgeCollection.insert(record);
      assert(record.end, record);
      edge = new Edge(this, record);
      edge.target = target;
      this.edges.push(edge);
      //let check = this.getEdge(name);
      //assert(check, 'proper connection');
      //this.links[name] = target;
    }
    return edge;
  }

}
