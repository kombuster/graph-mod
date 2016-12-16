const GraphNode = require('./graph-node');
const ObjectId = require('mongodb').ObjectID;

module.exports = class Collection {
  constructor(db, name) {
    this.db = db;
    this.mongo = db.db;
    this.name = name;
  }

  async readNode(key) {
    if (typeof key === 'string') {
      key = { _id: new ObjectId(key)};
    }
    let results = await this.read(key, this.name);
    if (results && results.length) {
      //nsole.log(results[0]);
      let node = new GraphNode(this, key, results[0]).withId(results[0]._id);
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
      let result = await this.insert(combined);
      return new GraphNode(this, filter, data).withId(result.insertedId);
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

  async clear() {
    return new Promise((resolve, reject) => {
      this.mongo.collection(this.name).remove({}, (err, result) =>{
        if (err) {
          reject(err);
        } else {
          resolve(result);
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
          //console.log(crudResult.insertedId);
          resolve(crudResult);
        }
      });
    });
  }

}
