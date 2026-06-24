const http = require('http');

const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

function checkServer(retries = 0) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001', (res) => {
      resolve();
    }).on('error', () => {
      if (retries >= MAX_RETRIES) {
        reject(new Error('Vite dev server failed to start'));
        return;
      }
      setTimeout(() => {
        checkServer(retries + 1).then(resolve).catch(reject);
      }, RETRY_DELAY);
    });
  });
}

checkServer()
  .then(() => {
    console.log('Vite dev server is ready!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
