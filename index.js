#!/bin/bash

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');

const app = express();
app.use(express.static(__dirname));

https.createServer({
  key: fs.readFileSync('cert/privkey.pem'),
  cert: fs.readFileSync('cert/fullchain.pem'),
}, app)
  .listen(443)

console.log(`https://dev.exokit.org`);
