const GraphNode = require('./graph-node');
const ObjectId = require('mongodb').ObjectID;

module.exports = class Collection {
  constructor(db, name) {
    this.db = db;
    this.mongo = db.db;
    this.name = name;
    this.cache = { };
  }

  async readNode(key) {
    if (typeof key === 'string') {
      if (this.cache[key]) {
        return this.cache[key];
      }
      key = { _id: new ObjectId(key)};
    }
    let results = await this.read(key, this.name);
    if (results && results.length) {
      const id = results[0]._id;
      if (this.cache[id]) {
        return this.cache[id];
      }
      //nsole.log(results[0]);
      let node = new GraphNode(this, key, results[0]).withId(id);
      await node.loadEdges();
      node.state = this.db.states.UNCHANGED;
      this.cache[id] = node;
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
        existing.state = this.db.states.UPDATED;
      }
      return existing;
    } else {
      let combined = Object.assign({}, filter, data);
      let result = await this.insert(combined);
      let id = result.insertedId;
      let newNode = new GraphNode(this, filter, data).withId(id);
      newNode.state = this.db.states.NEW;
      this.cache[id] = newNode;
      return newNode;
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
