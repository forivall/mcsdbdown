/* eslint-disable import/no-extraneous-dependencies */

var express = require('express');
var levelup = require('levelup');
var mcsdown = require('./index');

var app = express();

app.use(require('mcs')());

app.use(function (req, res, next) {
  req.cache = levelup('cache', {db: mcsdown, sdk: req.oracleMobile, valueEncoding: 'json'});
  next();
});
