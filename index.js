
const util = require('util');

// max size is _supposed_ to be 4000, but something in doesn't allow that consistently
// aka: yay, more oracle bugs
const CHUNK_SIZE = 3840; // = (1<<11) + (1<<10) + (1<<9) + (1<<8)
// max columns in oracle db is 1000
const MAX_CHUNKS = 992; // = (1<<9) + (1<<8) + (1<<7) + (1<<6) + (1<<5)
const MAX_VALUE_SIZE = 4000 * 992;

const zeroPadStart4 = function (n) {
  var s = String(n);
  return '0000'.slice(s.length) + s;
};

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
  var columns = [
    {name: 'key', type: 'string', size: 1024}, // VARCHAR2(1024)
    {name: 'value', type: 'string', size: 4000}
  ];

  for (var i = 0; i < MAX_CHUNKS; i++) {
    columns.push({name: 'value_ck' + zeroPadStart4(i), type: 'string', size: 4000});
  }
  columns.push(
    {name: 'chunks', type: 'integer', size: 16},
    {name: 'modifiedOn', type: 'dateTime'}
  );

  return {
    name: this.location,
    columns: columns,
    primaryKeys: ['key'],
    requiredColumns: ['key']
  };
};

McsDbDOWN.prototype._open = function (options, callback) {
  if (options.sdk) {
    this._sdk = options.sdk;
  }

  setImmediate(function () {
    callback(null, this);
  }.bind(this));
};

McsDbDOWN.prototype._put = function (key, value, options, callback) {
  if (value.length > MAX_VALUE_SIZE) {
    callback(new Error('Value is too large to be stored'));
    return;
  }

  var insert = {
    key: key
  };
  if (value.length <= 4000) {
    insert.value = value;
    insert.chunks = 0;
  } else {
    var l = value.length;
    var nchunks = Math.ceil(l / CHUNK_SIZE);
    for (var i = 0; i < nchunks; i++) {
      var start = i * CHUNK_SIZE;
      insert['value_ck' + zeroPadStart4(i)] = value.slice(start, start + CHUNK_SIZE);
    }
    insert.chunks = nchunks;
  }
  this._sdk.database.merge(this.location, insert, createOpts, {json: true})
  .then(function () {
    callback();
  })
  .catch(function (err) {
    console.log(err.stack || err);
    callback(err);
  });
};

McsDbDOWN.prototype._get = function (key, options, callback) {
  this._sdk.database.get(this.location, key, {}, {json: true})
  .then(function (resp) {
    if (resp.result.items.length === 0) {
      // 'NotFound' error, consistent with LevelDOWN API
      callback(new Error('NotFound'));
    }
    var item = resp.result.items[0];
    var value;
    if (item.chunks === 0 || item.chunks == null) {
      value = item.value;
    } else {
      value = '';

      var nchunks = item.chunks;
      for (var i = 0; i < nchunks; i++) {
        value += item['value_ck' + zeroPadStart4(i)];
      }
    }
    callback(null, value);
  })
  .catch(function (err) {
    callback(err);
  });
};

McsDbDOWN.prototype._del = function (key, options, callback) {
  this._sdk.database.delete(this.location, key, {}, {json: true})
  .then(function (resp) {
    if (resp.result.rowCount === 0) {
      console.log('Warning: deleted key not found');
    }
    callback();
  })
  .catch(function (err) {
    callback(err);
  });
};
