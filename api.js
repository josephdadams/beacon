const express = require('express')
const http = require('http')
const socketio = require('socket.io')

const util = require('./util.js')
const config = require('./config.js')

const package_json = require('./package.json')
const VERSION = package_json.version

var server = null
var httpServer = null
var io = null

class API {
	static start(port) {
		//starts the REST API
		server = express()

		httpServer = new http.Server(server)
		io = new socketio.Server(httpServer, { allowEIO3: true })

		server.use(express.json()) //parse json in body

		server.get('/version', function (req, res) {
			res.send({ version: VERSION })
		})

		server.get('/control_status', function (req, res) {
			res.send({ control_status: config.get('allowControl') })
		})

		server.get('/devices', function (req, res) {
			res.send({ devices: util.getDevices() })
		})

		server.get('/colors', function (req, res) {
			res.send({ colors: util.getColors() })
		})

		server.get('/sounds', function (req, res) {
			res.send({ sounds: util.getSounds() })
		})

		server.post('/beacon', function (req, res) {
			let beaconObj = req.body
			if (beaconObj) {
				util.showNotification(beaconObj)
				util.engageBeacon(beaconObj)
				util.playSound(beaconObj)
			}

			res.send({ control_status: config.get('allowControl') })
		})

		server.use(function (req, res) {
			res.status(404).send({ error: true, url: req.originalUrl + ' not found.' })
		})

		io.sockets.on('connection', (socket) => {
			let ipAddr = socket.handshake.address
			socket.emit('control_status', config.get('allowControl'))

			socket.on('version', function () {
				socket.emit('version', VERSION)
			})

			socket.on('control_status', function () {
				socket.emit('control_status', config.get('allowControl'))
			})

			socket.on('devices', function () {
				socket.emit('devices', util.getDevices())
			})

			socket.on('colors', function () {
				socket.emit('colors', util.getColors())
			})

			socket.on('sounds', function () {
				socket.emit('sounds', util.getSounds())
			})

			socket.on('beacon', function (beaconObj) {
				if (beaconObj) {
					util.showNotification(beaconObj)
					util.engageBeacon(beaconObj)
					util.playSound(beaconObj)
				}
			})
		})

		httpServer.listen(port)
		console.log('REST/Socket.io API server started on: ' + port)

		util.startUp()
	}

	static sendControlStatus() {
		io.sockets.emit('control_status', config.get('allowControl'))
	}
}

module.exports = API
