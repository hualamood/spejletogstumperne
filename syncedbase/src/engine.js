const Utils = require('./utils.js')

//Function that can be fed info express js.
//Will feed the arguments req, res

module.exports = class Engine {
  constructor(db, stor, s, ipfs) {
    this.db = db
    this.stor = stor
    this.ipfs = ipfs
    this.synced = s
  }

  API_Errors(error, err) {
    let errors = {
      p_missing: {
        'error': 'parameters missing',
        'inf': error,
      },
      db_err: {
        'error': 'database error',
        'inf': error,
        'err': err,
      },
      crypto_err: {
        'error': 'crypto error',
        'inf': error,
        'err': err,
      },
      sync_err: {
        'error': 'sync error',
        'inf': 'problem with synclib',
        'err': err,
      },
      user_taken: {
        'error': 'user taken',
        'inf': 'the owner id you provided is already taken',
      },
      invalid_confimation: {
        'error': 'invalid confirmation',
        'inf': 'the message you decrypted doesnt matchup'
      },
      no_user: {
        'error': 'user does not exist',
        'inf': 'user not found in database'
      }
    }
    if (error in errors) {
      return JSON.stringify(errors[error])
    }
  }

  GetKeyHash(req, res) {
    this.synced.keychain.GetID_MSGHash(req.params.id).then((key) => {
      res.send(key)
    })
  }

  GetIdKey(req, res) {
    this.synced.db.get(req.params.id, (err, result) => {
      if (err) {
        res.send(this.API_Errors('no_user'))
      } else {
        res.send(result)
      }
    })
  }

  GetIdKeyPlain(req, res) {
    this.synced.db.get(req.params.id, (err, result) => {
      if (err) {
        res.send(this.API_Errors('no_user'))
      } else {
        const key = Utils.B64Decode(JSON.parse(result).value)
        res.send(key)
      }
    })
  }

  VerifyKey(req, res) {
    if (!req.body) return res.sendStatus(400)
    const body = req.body
    if (body.decrypted && body.owner) {
      const decrypted = body.decrypted
      const owner = body.owner
      const msgHash = Utils.Createhash(body.decrypted)
      this.db.get(owner).then((doc) => {
        if (doc.status == 'pending' && doc.confirmation == msgHash) {
          return {
            db_resp: this.db.put({
              _id: owner,
              _rev: doc._rev,
              status: 'registered',
            }),
            publicKey: doc.publicKey,
          }
        }
      }).then((response) => {
        if (response) {
          this.synced.SecSyncPut(owner, response.publicKey).then(() => {
            res.send('you are successfully registered')
          }).catch((err) => {
            res.send(this.API_Errors('sync_err'))
          })
        } else {
          res.send(this.API_Errors('invalid_confimation', null))
        }
      }).catch((err) => {
        res.send(this.API_Errors('db_err', err));
      });
    }
  }

  RegisterKey(req, res) {
    if (!req.body) return res.sendStatus(400)
    const body = req.body
    if (body.publicKey && body.owner) {
      const owner  = body.owner
      const publicKey = Utils.B64Decode(body.publicKey)
      const randomMessage = Utils.RandomWordsInsecure(30)
      const randMsgHash = Utils.Createhash(randomMessage)
      const to_put = {
        _id: owner,
        confirmation: randMsgHash,
        status: 'pending',
        publicKey: body.publicKey
      }
      this.synced.cryptutil.PGPEncrypt(publicKey, randomMessage).then(encrypted => {
        this.db.put(to_put).then((response) => {
          res.send(encrypted)
        }).catch((err) => {
          this.db.get(owner).then((doc) => {
            if (doc.status == 'pending') {
              return this.db.put(to_put)
            }
          }).then((response) => {
            if (response) {
              res.send(encrypted)
            } else {
              res.send(this.API_Errors('user_taken', null))
            }
          }).catch((err) => {
            res.send(this.API_Errors('db_err', err))
          })
        })
      }).catch(err => {
        res.send(this.API_Errors('crypto_err', err))
      })
    }
  }
};
