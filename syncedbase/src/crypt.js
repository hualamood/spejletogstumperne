const crypto = require('crypto')
const openpgp = require('openpgp')

module.exports = class CryptUtil {
  constructor() {
    this.algorithm = 'aes-256-ctr'
  }

  Encrypt(text, password){
    let cipher = crypto.createCipher(this.algorithm, password)
    let crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
  }

  Decrypt(text, password){
    console.log("password", password)
    let decipher = crypto.createDecipher(this.algorithm, new Buffer(password))
    let dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
  }

  async PGPDecrypt(privKey, passphrase, encrypted) {
    return await new Promise(async (resolve, reject) => {
      const privKeyObj = (await openpgp.key.readArmored(privkey)).keys[0]
      await privKeyObj.decrypt(passphrase)
      const options = {
        message: await openpgp.message.readArmored(encrypted),
        privateKeys: [privKeyObj]
      }
      openpgp.decrypt(options).then(plaintext => {
          resolve(plaintext.data)
      })
    });
  }

  async PGPEncrypt(publicKey, msg) {
    return await new Promise(async (resolve, reject) => {
      const options = {
        message: openpgp.message.fromText(msg),
        publicKeys: (await openpgp.key.readArmored(publicKey)).keys,
      }
      openpgp.encrypt(options).then(ciphertext => {
        return ciphertext.data
      })
      .then(encrypted => resolve(encrypted))
    });
  }
}
