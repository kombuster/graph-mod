module.exports = class Query {
  constructor(collection) {
    this.collection = collection;
  }

  async run(predicate, projection, backtrack) {
    //this is where it will be initially filtered
    let records = await this.collection.read({});
    let results = [];
    for(let record of records) {
      let node = await this.collection.readNode(record._id);
      for(let edge of node.edges) {
        await edge.load();
      }
      if (backtrack) {
        
      }
      if (predicate) {
        if (!predicate(node)){
          continue;
        }
      }
      if (projection) {
        let result = {};
        if (Array.isArray(projection)) {
          projection.forEach(f => result[f] = node.key[f] || node.data[f]);
        } else {
          result = await projection(node);
        }
        results.push(result);
      }
    }
    
    return {results};
    //return records;
  }
}