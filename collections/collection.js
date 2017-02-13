const GraphNode = require('./graph-node');
const ObjectId = require('mongodb').ObjectID;
const Query = require('./query');

module.exports = class Collection {
  constructor(db, name) {
    this.db = db;
    this.mongo = db.db;
    this.name = name;
    this.idCache = { };
    this.keyCache = { };
  }

  async query(...args) {
    let results = await (new Query(this)).run(...args);
    return results;
  }

  async readNode(key) {
    let node = null;
    let json = null;
    if (typeof key === 'string') {
      if (this.idCache[key]) {
        node = this.idCache[key];
      }
      key = { _id: new ObjectId(key)};
    } else {
      json = JSON.stringify(key);
      if (this.keyCache[json]) {
        node = this.keyCache[json];
      }
    }

    if (node) {
      node.state = this.db.states.UNCHANGED;
      return node;
    }
    let results = await this.read(key, this.name);
    //console.log('loading', key);
    //console.log(Object.keys(this.keyCache));
    if (results && results.length) {
      const id = results[0]._id;
      //console.log('found:', results[0]);
      // if (this.idCache[id]) {
      //   node = this.idCache[id];
      //   node.state = this.db.states.UNCHANGED;
      //   return node;
      // }
      let nodeKey = Object.assign({}, results[0]);
      delete nodeKey._id;
      delete nodeKey._data;

      node = new GraphNode(this, nodeKey, results[0]._data).withId(id);
      await node.loadEdges();
      node.state = this.db.states.UNCHANGED;
      this.idCache[id] = node;
      this.keyCache[json] = node;
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
      let combined = Object.assign({}, filter);
      combined._data = data;
      let result = await this.insert(combined);
      let id = result.insertedId;
      let newNode = new GraphNode(this, filter, data).withId(id);
      newNode.state = this.db.states.NEW;
      this.idCache[id] = newNode;
      this.keyCache[JSON.stringify(filter)] = newNode;
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
