import requests
import base64
import gnupg

class client(object):
    """docstring for client."""
    def __init__(self, gpghome='~/.gnupg' ,binary='/usr/local/MacGPG2/bin/gpg', address='localhost', port=1147):
        super(client, self).__init__()
        self.gpg = gnupg.GPG(binary=binary, homedir=gpghome, keyring='pubring.gpg')
        self.address = address
        self.port = port

    def FindKey(self, keyname):
        public_keys = self.gpg.list_keys()
        for k in public_keys:
            for uid in k['uids']:
                if keyname in uid:
                    return k
                    
    def GetVerification(self, keyname, key):
        base64key = base64.b64encode(key.encode('utf-8')).decode('ascii')
        r = requests.post(
            'http://{0}:{1}/register'.format(self.address, self.port),
            json={'owner': keyname, 'publicKey': base64key})
        return r.text

    def VerifyKey(self, keyname, verification):
        r = requests.post(
            'http://{0}:{1}/verify'.format(self.address, self.port),
            json={'owner': keyname, 'decrypted': verification})
        return r.text

    def RegisterKey(self, keyname):
        key = self.FindKey(keyname)
        if key:
            ascii_keys = self.gpg.export_keys([key['keyid']])
            verification = self.GetVerification(keyname, ascii_keys)
            if verification:
                decrypted = self.gpg.decrypt(verification)
                registration = self.VerifyKey(keyname, str(decrypted))
                return registration

c = client()
print(c.RegisterKey('Geko2'))
print(c.RegisterKey('Geko1'))
print(c.RegisterKey('hualamood'))
