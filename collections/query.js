module.exports = class Query {
  constructor(collection) {
    this.collection = collection;
    this._predicate = (n)=>true;
    this._projection = (n)=>n;
  }

  where(func) {
    return this.predicate(func);
  }

  predicate(func) {
    this._predicate = func;
    return this;
  }

  projection(func) {
    this._projection = func;
    return this;
  }

  async run() {
    //this is where it will be initially filtered
    let records = await this.collection.read({});
    let results = [];
    for(let record of records) {
      let node = await this.collection.readNode(record._id);
      for(let edge of node.edges) {
        await edge.load();
      }
      if (!(await this._predicate(node))){
        continue;
      }

      let result = await this._projection(node);
      results.push(result);
    }
    
    return results;
  }
}