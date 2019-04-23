const ipfs_api = require('ipfs-http-client')
const uuidv4 = require('uuid/v4');

const keychain = require('./keychain.js')
const cryptutil = require('./crypt.js')
const Utils = require('./utils.js')

module.exports = class Sync {
  constructor(db, ipfs_addr, sync_topic) {
    this.db = db
    this.sync_topic = sync_topic

    this.ipfs = ipfs_api(ipfs_addr, 5001)
    this.id = uuidv4()

    this.keychain =  new keychain(this.db)
    this.cryptutil = new cryptutil()

    this.SubSync()
  }

  SyncPut(key, value) {
    return new Promise((resolve, reject) => {
      this.keychain.AddMessage(value).then((keys) => {
        this.db.put(key, JSON.stringify({value, id:keys.hash_id}), (err) => {
          const enc_value = this.cryptutil.Encrypt(value, keys.keychain_hash)
          const post_val = {hash:keys.msg_hash, key, value:enc_value}
          post_val.inf = 'sync'
          post_val.mode = 'add'
          post_val.from = this.id
          this.ipfs.pubsub.publish(this.sync_topic, Utils.ObjectToBuffer(post_val), (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      }).catch((err) => {
        reject(err)
      })
    });
  }

  SecSyncPut(key, val) {
    return new Promise((resolve, reject) => {
      this.db.get(key, (err, res) => {
        if (err) {
          this.SyncPut(key, val).then(() => {
            resolve()
          }).catch((err) => {
            reject(err)
          })
        } else {
          reject(new Error('Already set'))
        }
      })
    });
  }

  SyncVal(key, val, hash) {
    return new Promise((resolve, reject) => {
      console.log(this.keychain)
      this.keychain.GetKey(hash).then((keychain_hash) => {
        let dec_value = this.cryptutil.Decrypt(val, keychain_hash)
        if (dec_value) {
          this.keychain.AddMessage(dec_value).then(() => {
            console.log("Appending key", key, "value", dec_value)
            this.db.put(key, dec_value, (err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        }
      }).catch((keychain_hash) => {
        console.log("Start of sync", keychain_hash);
        let dec_value = this.cryptutil.Decrypt(val, keychain_hash)
        if (dec_value) {
          this.keychain.AddMessage(dec_value).then(() => {
            this.db.put(key, dec_value, (err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        } else {
          console.log("Value didnt decrypt");
          reject(new Error("CRYPTO ERR"))
        }
      })
    });
  }

  SyncHandler(msg) {
    const data = msg.data.toString()
    const json_data = JSON.parse(data)
    if (json_data.inf) {
      if (json_data.inf == 'sync' && json_data.from != this.id) {
        if (json_data.mode == 'add') {
          this.SyncVal(json_data.key, json_data.value, json_data.hash)
        }
      }
    }
  }

  SubSync() {
    return new Promise((resolve, reject) => {
      this.ipfs.pubsub.subscribe(this.sync_topic,
        (msg) => this.SyncHandler(msg),
        {discover:true},
        (err) => {
          if (err) {
            reject(err)
          } else {
            console.log("Syncing Keys")
            resolve()
          }
      })
    });
  }
}
