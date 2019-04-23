const crypto = require('crypto');
const randomWords = require('random-words');

module.exports = class Utils {
  constructor() {}

  static Createhash(hash_string) {
    return crypto.createHash('sha256').update(hash_string).digest("hex");
  }

  static ObjectToBuffer(object) {
    return Buffer.from(JSON.stringify(object))
  }

  static RandomWordsInsecure(amount) {
    return randomWords({ exactly: amount, join: ' ' })
  }

  static B64Decode(string) {
    return new Buffer(string, 'base64').toString('ascii');
  }

  static B64Encode(string) {
    return new Buffer(string).toString('base64')
  }
};
