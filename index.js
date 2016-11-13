const graphDb = require('./db');
//--harmony-async-await

async function test () {  
  try{
    let db = await graphDb(require('./test-configuration.json'));

    console.log('db connected');
    let collection = db.testNodes;
    //console.log('collection', collection);
    let n1 = await collection.merge({ name: 'node 1' }, { status: 'important', touch: Date.now() });
    let n2 = await collection.merge({ name: 'node 2' }, { status: 'very important'});
    //console.log(n1);
    await n1.connect(n2, { name:'state-transition' });

    //load node
    n1 = await collection.readNode({ name: 'node 1' });
    //console.log(n1.edges);
    n2 = await n1.edges[0].load();
    console.log(n2);
    db.disconnect();
    console.log('db disconnected');
  } catch (exception) {
    console.error(exception);
  }
  // console.log('timer started')
  // await timeout(10000);
  // console.log('timer finished')
}

test();