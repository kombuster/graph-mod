const timeout = function (delay) {  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}

async function timer () {  
  console.log('timer started')
  await timeout(10000);
  console.log('timer finished')
}

timer();