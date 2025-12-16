console.log("BOOT OK");

const http = require("http");

const port = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("HEROKU WORKING");
  })
  .listen(port, () => {
    console.log("Listening on " + port);
  });
