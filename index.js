
const util = require('util');

const AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN;

const setImmediate = global.setImmediate || process.nextTick;

module.exports = McsDbDOWN;

const createOpts = {
  primaryKeys: 'key',
  extraFields: 'modifiedOn'
};

function McsDbDOWN(location) {
  if (!(this instanceof McsDbDOWN)) {
    return new McsDbDOWN(location);
  }

  AbstractLevelDOWN.call(this, location);
}
util.inherits(McsDbDOWN, AbstractLevelDOWN);

McsDbDOWN.prototype.getMetadata = function () {
  return {
    name: this.location,
    columns: [
      {name: 'key', type: 'string', size: 1024}, // VARCHAR2(1024)
      {name: 'value', type: 'string', size: 4096}, // > 4000 bytes = CLOB
      {name: 'modifiedOn', type: 'dateTime'}
    ],
    primaryKeys: ['key'],
    requiredColumns: ['key', 'value']
  };
};

McsDbDOWN.prototype._open = function (options, callback) {
  console.log(options);
  if (options.sdk) {
    this._sdk = options.sdk;
  }

  setImmediate(function () {
    callback(null, this);
  }.bind(this));
};

McsDbDOWN.prototype._put = function (key, value, options, callback) {
  this._sdk.database.merge(this.location, {
    key: key,
    value: value
  }, createOpts)
  .then(function () {
    callback();
  })
  .catch(function (err) {
    callback(err);
  });
};

McsDbDOWN.prototype._get = function (key, options, callback) {
  this._sdk.database.get(this.location, {
    key: key
  })
  .then(function (resp) {
    callback(resp.result.items[0]);
  })
  .catch(function (err) {
    callback(err);
  });
};

McsDbDOWN.prototype._del = function (key, options, callback) {
  this._sdk.database.delete(this.location, {
    key: key
  })
  .then(function () {
    callback();
  })
  .catch(function (err) {
    callback(err);
  });
};
