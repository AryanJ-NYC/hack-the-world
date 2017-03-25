'use strict';
const express = require('express'),
      app = express(),
      path = require('path'),
      cors = require('cors'),
      bodyParser = require('body-parser');

// load environment variables using dotenv
if (process.env.NODE_ENV == 'development') {
  require('dotenv').config();
}

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({ error: { message: err.message }});
});

const routes = require('./routes/routes');
app.use('/api', routes);

const portNumber = process.env.PORT || 8080;
app.listen(portNumber, () => {
  console.log(`Listening on port ${portNumber}`);
});
