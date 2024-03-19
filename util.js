'use strict';

const {app, Notification, nativeImage, systemPreferences, Menu, shell, screen } = require('electron');

const config = require('./config.js');

const package_json = require('./package.json');
const VERSION = package_json.version;

//luxafor library
const luxafor = require('luxafor-api');

//blink(1) library
const blink1 = require('node-blink1');

//busylight library
const busylight = require('busylight');

function setUpBeacons() {
	global.DEVICES = [];
	global.USB_DEVICES = 0;

	detectScreens();
	detectLuxafor();
	detectBlink();
	detectBusylight();

	buildContextMenu();

	engageBeacon({
		deviceId: 'all',
		beaconType: 'off'
	});

	if (global.USB_DEVICES == 0) {
		showNotification({title: 'No beacon devices found.', body: 'If you wish to use beacon with a USB busylight, please connect a compatible device and rescan for USB devices from the menu.', showNotification: true});
	}
	else {
		showNotification({title: `${global.USB_DEVICES} device${ (global.USB_DEVICES > 1 ? 's' : '')} found.`, body: 'You can now use the API to control your beacon devices.', showNotification: true});
	}
}

function detectScreens() {
	let screenDevices = screen.getAllDisplays();
	global.win.webContents.send('screens', screenDevices);
	//loop through the screens and add them to the devices array
	for (let i = 0; i < screenDevices.length; i++) {
		let screenDevice = {};
		screenDevice.deviceId = 'screen-' + (i+1);
		screenDevice.deviceType = 'screen';
		screenDevice.deviceName = 'Screen ' + (i+1);
		global.DEVICES.push(screenDevice);
	}
}

function detectLuxafor() {
	try {
		let luxaforDevices = luxafor.devices();
		//loop through the devices and add them to the devices array
		for (let i = 0; i < luxaforDevices.length; i++) {
			luxaforDevices[i].deviceId = 'luxafor-' + (i+1); //luxafor devices don't have a serial number
			luxaforDevices[i].deviceType = 'luxafor';
			luxaforDevices[i].deviceName = 'Luxafor ' + (i+1);
			global.DEVICES.push(luxaforDevices[i]);
			global.USB_DEVICES++;
		}
	}
	catch(error) {
		//probably no luxafors detected
		console.log(error);
	}
}

function detectBlink() {
	try {
		let blink1Devices = new blink1.devices();
		//loop through the devices and add them to the devices array
		for (let i = 0; i < blink1Devices.length; i++) {
			let blinkDevice = new blink1(blink1Devices[i]);
			blinkDevice.deviceId = 'blink1-' + blink1Devices[i]; //blink1 devices do have a serial number
			blinkDevice.deviceType = 'blink1';
			blinkDevice.deviceName = 'Blink(1) ' + (i+1);
			global.DEVICES.push(blinkDevice);
			global.USB_DEVICES++;
		}
	}
	catch(error) {
		//probably no blink(1) detected
		console.log(error);
	}
}

function detectBusylight() {
	try {
		let busylights = busylight.devices();
		//loop through the devices and add them to the devices array
		for (let i = 0; i < busylights.length; i++) {
			//let busylightDevice = busylight.get(busylights[i].path);
			let busylightDevice = busylight.get();
			busylightDevice.path = busylights[i].path; //store the path for later use
			busylightDevice.deviceId = 'busylight-' + (i+1); //busylight devices don't have a serial number
			busylightDevice.deviceType = 'busylight';
			busylightDevice.deviceName = 'Busylight ' + (i+1);

			busylightDevice.defaultSettings = {
				keepalive: true,      // If the busylight is not kept alive it will turn off after 30 seconds
				color: 'white',       // The default color to use for light, blink and pulse
				duration: 30 * 1000,  // The duration for a blink or pulse sequence
				rate: 300,            // The rate at which to blink or pulse
				degamma: true,        // Fix rgb colors to present a better light
				tone: 'OpenOffice',   // Default ring tone
				volume: 4             // Default volume
			}; //store defaults to use later

			busylightDevice.defaults(busylightDevice.defaultSettings); //set the defaults for the device
			
			global.DEVICES.push(busylightDevice);
			global.USB_DEVICES++;
		}
	}
	catch(error) {
		//probably no blink(1) detected
		console.log(error);
	}
}

function buildContextMenu() {
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'beacon: v' + VERSION,
			enabled: false
		},
		{
			label: 'API running on port: ' + config.get('apiPort'),
			enabled: false
		},
		{
			type: 'separator'
		},
		{
			label: 'USB Devices Detected: ' + global.USB_DEVICES,
			enabled: false
		},
		{
			label: 'Rescan for USB Devices',
			click: function () {
				setUpBeacons();
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Allow Beacon Remote Control',
			type: 'checkbox',
			checked: config.get('allowControl'),
			click: function () {
				config.set('allowControl', !config.get('allowControl'));
				global.sendControlStatus();
			}
		},
		{
			label: 'Allow On Screen Beacon',
			type: 'checkbox',
			checked: config.get('allowOnScreenBeacon'),
			click: function () {
				config.set('allowOnScreenBeacon', !config.get('allowOnScreenBeacon'));
				detectScreens();
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Show Notifications',
			type: 'checkbox',
			checked: config.get('allowNotifications'),
			click: function () {
				config.set('allowNotifications', !config.get('allowNotifications'));
			}
		},
		{
			label: 'Play Sounds',
			type: 'checkbox',
			checked: config.get('allowSounds'),
			click: function () {
				config.set('allowSounds', !config.get('allowSounds'));
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Request Help/Support',
			click: function() {
				shell.openExternal(config.get('supportUrl'))
			}
		},
		{
			label: 'Quit',
			click: function () {
				app.quit();
			}
		}
	]);

	tray.setContextMenu(contextMenu);
}

function showNotification(beaconObj) {
	const icon = nativeImage.createFromDataURL(config.get('icon'));
		
	if (config.get('allowNotifications')) {
		if (beaconObj.showNotification == true) {
			let NOTIFICATION_TITLE = beaconObj.title || 'Beacon Notification';
			let NOTIFICATION_BODY = beaconObj.body || '';
			new Notification(
				{
					title: NOTIFICATION_TITLE,
					subtitle: NOTIFICATION_BODY,
					icon: icon,
					silent: true
				}
			).show();	
		}
	}
}

function engageBeacon(beaconObj) {
	//light up the beacon if connected
	if (config.get('allowControl')) {
		for (let i = 0; i < global.DEVICES.length; i++) {
			if ((global.DEVICES[i].deviceId == beaconObj.deviceId) || (beaconObj.deviceId == 'all')) {
				switch(global.DEVICES[i].deviceType) {
					case 'luxafor':
						useLuxafor(global.DEVICES[i], beaconObj);
						break;
					case 'blink1':
						useBlink(global.DEVICES[i], beaconObj);
						break;
					case 'busylight':
						useBusylight(global.DEVICES[i], beaconObj);
						break;
					case 'screen':
						useScreen(global.DEVICES[i], beaconObj);
						break;
					default:
						break;
				}
			}
		}
	}
}

function playSound(beaconObj) {
	if (config.get('allowSounds')) {
		if (beaconObj.playSound == true || beaconObj.beaconType == 'sound') {
			//play the sound
			let soundObj = global.SOUNDS.find((sound) => (sound.id === beaconObj.soundId));
			
			if (soundObj) {
				//play the sound file
				global.win.webContents.send('sound', beaconObj, soundObj);
			}
		}
	}
}

function useLuxafor(luxaforDevice, beaconObj) {
	//make sure beaconObj has proper color and target property
	if (!beaconObj.color) {
		beaconObj.color = 'red';
	}

	if (beaconObj.color == 'custom') {
		if (beaconObj.color_r && beaconObj.color_g && beaconObj.color_b) {
			//convert rgb to hex
			let hex = rgbToHex(beaconObj.color_r, beaconObj.color_g, beaconObj.color_b);
			beaconObj.color = hex;
		}
		else if (beaconObj.hex) {
			beaconObj.color = beaconObj.hex;
		}
	}

	if (!beaconObj.target) {
		beaconObj.target = luxafor.targets.all;
	}

	try {
		switch(beaconObj.beaconType) {
			case 'set':
				luxaforDevice.color(beaconObj.color, beaconObj.target);
				break;
			case 'fade':
				if (!beaconObj.speed) {
					beaconObj.speed = 20;
				}
	
				luxaforDevice.fadeTo(beaconObj.color, beaconObj.speed, beaconObj.target);
				break;
			case 'flash':
				if (!beaconObj.speed) {
					beaconObj.speed = 20;
				}
	
				if (!beaconObj.repeat) {
					beaconObj.repeat = 5;
				}
	
				luxaforDevice.flash(beaconObj.color, beaconObj.speed, beaconObj.repeat, beaconObj.target);
				break;
			case 'off':
			default:
				luxaforDevice.off();
				break;
		}
	}
	catch(error) {
		//unable to write to device for some reason
		console.log(error);
		showNotification(
			{
				title: 'Beacon Error',
				body: `Unable to control Luxafor device: ${luxaforDevice.deviceId}. Did it get disconnected?`,
				showNotification: true
			}
		)
	}
}

function useBlink(blinkDevice, beaconObj) {
	//make sure beaconObj has proper color and target property
	let colorObj = {};

	if (!beaconObj.color) {
		beaconObj.color = 'red';
	}

	if (beaconObj.color == 'custom') {
		if (beaconObj.color_r && beaconObj.color_g && beaconObj.color_b) {
			//convert rgb to hex
			colorObj = { r: beaconObj.color_r, g: beaconObj.color_g, b: beaconObj.color_b };
		}
		else if (beaconObj.hex) {
			colorObj = hexToRgb(beaconObj.hex);
		}
	}
	else {
		colorObj = global.COLORS.find(color => color.id == beaconObj.color); //find the color object

		//if the color is not found, use the default color
		if (!colorObj) {
			colorObj = global.COLORS.find(color => color.id == 'red');
		}
	}

	//invert the speed values for blink
	if (beaconObj.speed) {
		beaconObj.speed = 255 - beaconObj.speed;
	}

	try {
		switch(beaconObj.beaconType) {
			case 'set':
				blinkDevice.setRGB(colorObj.r, colorObj.g, colorObj.b);
				break;
			case 'fade':
				if (!beaconObj.speed) {
					beaconObj.speed = 20;
				}
	
				blinkDevice.fadeToRGB(beaconObj.speed, colorObj.r, colorObj.g, colorObj.b);
				break;
			case 'flash':
				if (!beaconObj.speed) {
					beaconObj.speed = 20;
				}
	
				if (!beaconObj.repeat) {
					beaconObj.repeat = 5;
				}
	
				blinkDevice.writePatternLine(beaconObj.speed, colorObj.r, colorObj.g, colorObj.b, 0);
				blinkDevice.writePatternLine(beaconObj.speed, 0, 0, 0, 1);
				blinkDevice.playLoop(0, 1, beaconObj.repeat);
				break;
			case 'off':
			default:
				blinkDevice.off();
				break;
		}
	}
	catch(error) {
		//unable to write to device for some reason
		showNotification(
			{
				title: 'Beacon Error',
				body: `Unable to control blink(1) device: ${blinkDevice.deviceId}. Did it get disconnected?`,
				showNotification: true
			}
		)
	}
}

function useBusylight(busylightDevice, beaconObj) {
	//make sure beaconObj has proper color and target property
	let colorObj = {};

	if (!beaconObj.color) {
		beaconObj.color = 'red';
	}

	if (beaconObj.color == 'custom') {
		if (beaconObj.color_r && beaconObj.color_g && beaconObj.color_b) {
			//convert rgb to hex
			colorObj = { r: beaconObj.color_r, g: beaconObj.color_g, b: beaconObj.color_b };
		}
		else if (beaconObj.hex) {
			colorObj = hexToRgb(beaconObj.hex);
		}
	}
	else {
		colorObj = global.COLORS.find(color => color.id == beaconObj.color); //find the color object

		//if the color is not found, use the default color
		if (!colorObj) {
			colorObj = global.COLORS.find(color => color.id == 'red');
		}
	}

	try {
		switch(beaconObj.beaconType) {
			case 'set':
			case 'fade': //couldn't really find a good way to fade this one
				busylightDevice.light(colorObj.id);
				break;
			case 'flash':
				if (!beaconObj.speed) {
					beaconObj.speed = 20;
				}
	
				if (!beaconObj.repeat) {
					beaconObj.repeat = 5;
				}

				busylightDevice.pulse([colorObj.hex], beaconObj.speed);

				//use the repeat like seconds and turn it off after the rate
				setTimeout(function() {
					busylightDevice.off();
				}, beaconObj.repeat * 1000);

				break;
			case 'off':
			default:
				busylightDevice.off();
				break;
		}

		if (beaconObj.playSound == true && config.get('allowSounds') == true) {
			//play the sound

			let tone = '';
			let timeoutMs = 2000;

			switch(beaconObj.soundId) {
				case 'single':
					tone = 'TelephoneNordic';
					break;
				case 'triple':
					tone = 'TelephoneOriginal';
					break;
				case 'hey':
					tone = 'Quiet';
					break;
				case 'hey-loud':
					tone = 'TelephonePickMeUp';
					break;
			}

			busylightDevice.ring(tone);
			//set a timeout to turn it off after a few seconds
			setTimeout(function() {
				busylightDevice.ring(false);
			}, timeoutMs);
		}
	}
	catch(error) {
		//unable to write to device for some reason
		console.log(error);
		showNotification(
			{
				title: 'Beacon Error',
				body: `Unable to control busylight device: ${busylightDevice.deviceId}. Did it get disconnected?`,
				showNotification: true
			}
		)
	}
}

function useScreen(screenDevice, beaconObj) {
	if (config.get('allowOnScreenBeacon')) {
		switch(beaconObj.beaconType) {
			default:
				//for now, let the renderer process decide what to do with the beacon object
				global.win.showInactive();
				global.win.webContents.send('beacon', beaconObj);
				break;
		}
	}
	else {
		global.win.hide(); //hide the window if the on screen beacon is not allowed
	}
}

module.exports = {
	startUp() {
		setUpBeacons();
	},

	showNotification(beaconObj) {
		showNotification(beaconObj);
	},

	engageBeacon(beaconObj) {
		engageBeacon(beaconObj);
	},

	playSound(beaconObj) {
		playSound(beaconObj);
	},

	getDevices() {
		let devices = [];
	
		let allObj = {
			deviceId: 'all',
			deviceType: 'all',
			deviceName: 'All Devices'
		}
		devices.push(allObj);
	
		for (let i = 0; i < global.DEVICES.length; i++) {
			let device = global.DEVICES[i];
			let deviceObj = {
				deviceId: device.deviceId,
				deviceType: device.deviceType,
				deviceName: device.deviceName
			};
			devices.push(deviceObj);
		}
	
		return devices;
	},
	
	getColors() {
		return global.COLORS;
	},
	
	getSounds() {
		return global.SOUNDS;
	}
}