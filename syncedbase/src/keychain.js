const Utils = require('./utils.js')

module.exports = class KeyChain {
  constructor(db) {
    this.db = db
  }

  AddMessage(msg) {
    return new Promise((resolve, reject) => {
      let _doc = {
        _id: "keychain",
        hash_collection: [],
      }
      let msg_hash = Utils.Createhash(msg)
      this.db.get('keychain', (err, already) => {
        if (err) {
          console.log(err);
          _doc.hash_collection.push(msg_hash)
        } else {
          let doc = JSON.parse(already)
          doc.hash_collection.push(msg_hash)
          _doc.hash_collection = doc.hash_collection
        }
        let keychain_hash = Utils.Createhash(JSON.stringify(_doc.hash_collection))
        this.db.put('keychain', JSON.stringify(_doc), (err) => {
          if (err) {
            reject(err)
          } else {
            const hash_id = _doc.hash_collection.length
            this.db.put(`msg_hash:id:${hash_id}`, msg_hash, (err) => {
              if (err) {
                reject(err)
              } else {
                console.log(msg_hash);
                resolve({keychain_hash, msg_hash, hash_id})
              }
            })
          }
        })
      })
    });
  }

  GetKey(msg_hash) {
    return new Promise((resolve, reject) => {
      this.db.get('keychain', (err, already) => {
        if (err) {
          console.log(err);
          console.log("Keychain probably doesnt exist")
          reject(Utils.Createhash(JSON.stringify([msg_hash])))
        } else {
          let doc = JSON.parse(already)
          doc.hash_collection.push(msg_hash)
          resolve(Utils.Createhash(JSON.stringify(doc.hash_collection)))
        }
      })
    });
  }

  GetID_MSGHash(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`msg_hash:id:${id}`, (err, key) => {
        if (err) {
          console.log(err);
          console.log("FAKE ALERT", id)
          reject(err)
        } else {
          resolve(key)
        }
      })
    });
  }
};
