'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

// util.js reads config via require('./config.js'), which is backed by electron-store
// and reads/writes a real file on disk. Stub it out so tests are deterministic and
// don't depend on (or mutate) whatever is currently persisted on this machine.
const configPath = require.resolve('../config.js')
require.cache[configPath] = {
	id: configPath,
	filename: configPath,
	loaded: true,
	exports: {
		get(key) {
			return { allowControl: true }[key]
		},
	},
}

const util = require('../util.js')

function makeLuxaforDevice(calls) {
	return {
		deviceId: 'luxafor-1',
		deviceType: 'luxafor',
		color: (...args) => calls.push(['color', ...args]),
		fadeTo: (...args) => calls.push(['fadeTo', ...args]),
		flash: (...args) => calls.push(['flash', ...args]),
		off: (...args) => calls.push(['off', ...args]),
	}
}

function makeBlink1Device(calls) {
	return {
		deviceId: 'blink1-1',
		deviceType: 'blink1',
		setRGB: (...args) => calls.push(['setRGB', ...args]),
		fadeToRGB: (...args) => calls.push(['fadeToRGB', ...args]),
		writePatternLine: (...args) => calls.push(['writePatternLine', ...args]),
		playLoop: (...args) => calls.push(['playLoop', ...args]),
		off: (...args) => calls.push(['off', ...args]),
	}
}

test.beforeEach(() => {
	global.COLORS = [{ id: 'red', label: 'Red', r: 255, g: 0, b: 0, hex: '#ff0000' }]
	global.io = { sockets: { emit: () => {} } }
})

test('engageBeacon does not leak per-device mutations across devices when targeting "all"', () => {
	const luxaforCalls = []
	const blinkCalls = []

	global.DEVICES = [makeLuxaforDevice(luxaforCalls), makeBlink1Device(blinkCalls)]

	// No speed given: useLuxafor defaults its own speed to 20. Before per-device
	// beaconObj copies were introduced, that 20 leaked into blink1's copy, which then
	// inverted it (255 - 20 = 235) instead of applying its own uninverted default of 20.
	util.engageBeacon({ deviceId: 'all', beaconType: 'fade', color: 'red' })

	assert.deepEqual(luxaforCalls, [['fadeTo', 'red', 20, 255]])
	assert.deepEqual(blinkCalls, [['fadeToRGB', 20, 255, 0, 0]])
})

test('notifyBeaconUsage reports the beaconObj actually applied to each device, not a shared/mutated one', () => {
	const luxaforCalls = []
	const blinkCalls = []
	const emitted = []

	global.DEVICES = [makeLuxaforDevice(luxaforCalls), makeBlink1Device(blinkCalls)]
	global.io = { sockets: { emit: (event, payload) => emitted.push({ event, payload }) } }

	util.engageBeacon({ deviceId: 'all', beaconType: 'fade', color: 'red' })

	assert.equal(emitted.length, 2)

	assert.equal(emitted[0].event, 'beacon_usage')
	assert.equal(emitted[0].payload.deviceId, 'luxafor-1')
	assert.equal(emitted[0].payload.beaconObj.speed, 20)

	assert.equal(emitted[1].event, 'beacon_usage')
	assert.equal(emitted[1].payload.deviceId, 'blink1-1')
	assert.equal(emitted[1].payload.beaconObj.speed, 20)
})
