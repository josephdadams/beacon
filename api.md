# beacon API

beacon has both a REST-based API as well as a socket.io API. Both run on Port `8802`.

## REST API

It is possible to disable remote control within the context menu of the beacon application. If this is done, you will receive this response when using the REST API:

```javascript
{
	control_status: false
}
```

## socket.io API

Upon connection, the server will emit the `control_status` event to let the client know whether or not remote control is available. This will be emitted any time it is changed. It can also be requested by the client at any time by emitting a `control_status` event. A boolean is returned, with `true` meaning it is enabled, and `false` being disabled.

## Available Methods

### REST: `/version`: GET

### socket.io: 'version'

Returns the version of beacon currently running.

```javascript
{version: 0.1.0}
```

### REST: `/control_status`: GET

### socket.io: 'control_status'

Returns whether remote control is currently enabled or not in beacon

```javascript
{
	control_status: true
}
```

### REST: `/devices`: GET

### socket.io: 'devices'

Returns a list of devices/beacons available.

### REST: `/colors`: GET

### socket.io: 'colors'

Returns a list of available colors that beacon can use.

```javascript
{ id: 'red', label: 'Red', r: 255, g: 0, b: 0 },
{ id: 'green', label: 'Green', r: 0, g: 255, b: 0 },
{ id: 'blue', label: 'Blue', r: 0, g: 0, b: 255 },
{ id: 'white', label: 'White', r: 255, g: 255, b: 255 },
{ id: 'yellow', label: 'Yellow', r: 255, g: 255, b: 0 },
{ id: 'cyan', label: 'Cyan', r: 0, g: 255, b: 255 },
{ id: 'magenta', label: 'Magenta', r: 255, g: 0, b: 255 },
{ id: 'black', label: 'Black', r: 0, g: 0, b: 0}
```

### REST: `/sounds`: GET

### socket.io: 'sounds'

Returns a list of available sounds/tones that beacon can use.

```javascript
{ id: 'single', label: '*' },
{ id: 'triple', label: '* * *' },
{ id: 'hey', label: 'Hey' },
```

### REST: `/beacon`: POST

### socket.io: 'beacon'

Send a beacon object via `application/json` in a POST request to control beacon.

```javascript
{
	device: `deviceId` or 'all',
	beaconType: `color/fade/flash/sound`,
	color: `colorId`,
	speed: speed (0-255),
	showNotification: true or false,
	title: title,
	body: body,
	playSound: true or false
	soundId: soundId
}
```

### socket.io: `error`:

Emitted whenever there is an error. Contains the error message as a string.
