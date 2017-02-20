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
    this.graphNodeClass = null;
  }


  where(func) {
    return this.query().where(func);
  }
  query() {
    return new Query(this);
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
      
      node = new this._graphNodeClass(this, nodeKey, results[0]._data).withId(id);
      await node.loadEdges();
      node.state = this.db.states.UNCHANGED;
      this.idCache[id] = node;
      this.keyCache[json] = node;
      return node;
    }
  }

  uncache(node) {
    delete this.idCache[node.id];
    let json = JSON.stringify(node.key);
    delete this.keyCache[json];
  }

  get _graphNodeClass() {
    const graphNodeClass = this.graphNodeClass || this.db.graphNodeClass;
    return graphNodeClass;
  }

  async read(filter) {
    if (!this.indexes) {
      let indexes = await this.mongo.collection(this.name).indexes();
      this.indexes = {};
      for(let index of indexes) {
        let key = index.key;
        let fields = Object.keys(key);
        fields.sort();
        this.indexes[fields.join(',')] = true;
      }
      //console.log(this.indexes);
    }
    let filterKeys = Object.keys(filter);
    filterKeys.sort();
    let filterSpec = filterKeys.join(',');
    if (!this.indexes[filterSpec]) {
      let indexSpec = Object.assign({}, filter);
      for(let key in indexSpec) {
        indexSpec[key] = 1;
      }
      console.log('creating index', indexSpec);
      await this.mongo.collection(this.name).createIndex(indexSpec);
      this.indexes[filterSpec] = true;
    }


    let result = await this._read(filter);
    return result;
  }

  // _getIndexes() {
  //   return new Promise((resolve, reject) => {
  //     this.mongo.collection(this.name).getIndexes((err, result) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         resolve(result);
  //       }
  //     });
  //   });
  // }

  _read(filter) {
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

  async merge(filter, data, ignoreData) {
    let existing = await this.readNode(filter);
    if (existing) {
      //need to check if there is a data update needed
      
      if (!ignoreData && !existing.sameAs(data)) {
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
      let newNode = new this._graphNodeClass(this, filter, data).withId(id);
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

  async remove(filter) {
    await this.mongo.collection(this.name).remove(filter);
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
