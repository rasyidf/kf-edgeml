/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const morgan = require('morgan');

const server = express();
server.use(morgan('common'));
server.use(express.static('./dist'));

const port = process.env.PORT || 9000;
const app = server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    console.info(`${signal} signal received, terminating server`);
    app.close();
    process.exit(0);
  });
});
