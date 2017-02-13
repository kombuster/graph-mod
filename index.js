const graphDb = require('./db');
const assert = require('assert');
//--harmony-async-await

async function test () {  
  let db = null;
  try{
    
    db = await graphDb(require('./test-configuration.json'));
    let all = await db.domains.query(n=>true, async n=>{
      const concepts = await n.backtrack('domain');
      return {
        n:n.key.domain,
        p:n.edges.map(e => e.target.key.domain).join(','),
        e:concepts[0].data.word
      };
    });
    console.log(all);
  } catch (exception) {
    console.error(exception);
  } finally {
    console.log('disconnected');
    db.disconnect();
  }
  // console.log('timer started')
  // await timeout(10000);
  // console.log('timer finished')
}

test();