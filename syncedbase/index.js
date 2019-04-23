const sync = require('./src/sync.js')
const level = require('level')
const express = require('express')
const bodyParser = require('body-parser')
const PouchDB = require('pouchdb');
const IpfsAPI = require('ipfs-http-client');
const Storage = require('./src/storage.js')
const Engine = require('./src/engine.js')

const ipfs = IpfsAPI('ipfs', '5001');
const db = level('mirror')

const server_db = new PouchDB('sdb');

const s = new sync(db, 'ipfs', 'sync_here_boi')
const stor = new Storage(ipfs)
const engine = new Engine(server_db, stor, s, ipfs)

const port = 1147
const app = express()

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/keyhash/:id', (req, res) => engine.GetKeyHash(req, res))
app.get('/key/:id', (req, res) => engine.GetIdKey(req, res))
app.get('/key/:id/plain', (req, res) => engine.GetIdKeyPlain(req, res))
app.post('/register', (req, res) => engine.RegisterKey(req, res))
app.post('/verify', (req, res) => engine.VerifyKey(req, res))

app.listen(port, () => console.log(`API listening on port ${port}!`))
