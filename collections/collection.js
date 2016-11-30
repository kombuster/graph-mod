const GraphNode = require('./graph-node');

class Collection {
  constructor(db, name) {
    this.db = db;
    this.mongo = db.db;
    this.name = name;
  }

  async readNode(key) {
    let results = await this.read(key, this.name);
    if (results && results.length) {
      let node = new GraphNode(this, key, results[0]);
      await node.loadEdges();
      return node;
    }
  }
  
  read(filter) {
    return new Promise((resolve, reject) => {
      this.mongo.collection(this.name).find(filter).toArray((err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results || []);
        }
      });
    });
  }

  async merge(filter, data) {
    let existing = await this.readNode(filter);
    if (existing) {
      //need to check if there is a data update needed
      if (!existing.sameAs(data)) {
        Object.assign(existing.data, data);
        await this.update(existing.key, existing.data);
      }
      return existing;
    } else {
      let combined = Object.assign({}, filter, data);
      await this.insert(combined);
      return new GraphNode(this, filter, data); 
    } 
  }

  update(filter, data) {
    return new Promise((resolve, reject) => {
      this.mongo.collection(this.name).updateOne(filter, { $set:data}, (err, crudResult) => {
        if (err) {
          reject(err);
        } else {
          resolve(crudResult);
        }
      });
    });     
  }

  insert(data) {
    return new Promise((resolve, reject)=> {
      this.mongo.collection(this.name).insertOne(data, (err, crudResult) => {
        if (err) {
          reject(err);
        } else {
          resolve(crudResult);
        }
      });
    });
  }
  
}


module.exports = Collection;