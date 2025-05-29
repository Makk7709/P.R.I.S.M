const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Received webhook:', body);
      res.statusCode = 200;
      res.end('OK');
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test webhook server listening on port ${PORT}`);
}); 