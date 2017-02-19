//'use strict';
const mongo = require('mongodb').MongoClient;
const assert = require('assert');
const Collection = require('./collections/collection');
const GraphNode = require('./collections/graph-node');

class Db {

  constructor(configuration){
    this.configuration = configuration;
    this.collections = new Map();
    this.states = {
      NEW:'NEW',
      UNCHANGED:'UNCHANGED',
      UPDATED:'UPDATED'
    };
    this.graphNodeClass = GraphNode;
  }



  connect(setup) {

    
    let self = this;
    return new Promise((resolve, reject)=>{
      console.log('connecting mongo', this.configuration.mongo.serverUrl);
      mongo.connect(this.configuration.mongo.serverUrl, (err, db) => {
        if (err) {
          return reject(err);
        }

        this.db = db;

        // let indexer = (collection, field) => {
        //   return new Promise((resolve, reject)=>{
        //     var index = {}; index[field] = 1;
        //     //console.log('creating index', index, 'on', collection);
        //     db.collection(collection).createIndex(index, null, function(err, results) {
        //       if(err) {
        //         return reject(err);
        //       }
        //       resolve(results);
        //     });
        //   });
        // };
        if (setup) {
          setup(self);
        }
        resolve(self);
        // //console.log(this.configuration.mongo);
        // if (this.configuration.mongo.indexes) {

        //   var self = this;
        //   co(function*(){
        //     for(let key in self.configuration.mongo.indexes) {
        //       for(let collection of self.configuration.mongo.indexes[key]) {
        //         yield indexer(collection, key);
        //       }
        //     }
        //     resolve(db);
        //   }).catch(reject);
        // } else {
        //   resolve(db);
        // }
      });
    });
  }







  remove(object, collection) {
    collection = collection || object._collection
    return new Promise((resolve, reject)=>{
      this.db.collection(collection).deleteMany(object, (err, crudResult)=>{
        if (err) {
          reject(err);
        } else {
          resolve(crudResult);
        }
      });
    });
  }

  getCollection(name) {
    if (this.collections.has(name)) {
    } else {
      this.collections.set(name, new Collection(this, name));
    }
    return this.collections.get(name);
  }

  disconnect(){
    this.db.close();
  }
}

module.exports = (configuration, setup) => {
  let db = new Db(configuration);
  let handler = {
      get: (target, name) => {
          return name in target?
              target[name] :
              target.getCollection(name);
      }
  };

  let proxy = new Proxy(db, handler);
  return proxy.connect(setup);
};
