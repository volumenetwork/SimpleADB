# SimpleADB

This is a module to execute simple commands with ADB

[![Build Status](https://travis-ci.org/volumenetwork/SimpleADB.svg?branch=master)](https://travis-ci.org/volumenetwork/SimpleADB)

## Basic Usage

```js

var SimpleADB = require('simple-adb').SimpleADB;

var sadb = new SimpleADB();

sadb.connect('192.168.1.5')
    .then(function () {
       console.log('connected');
    })
    .catch(function (err) {
       console.log(err);
    });

```

Here is an example on how to reboot your android device via ADB

```js

var SimpleADB = require('simple-adb').SimpleADB;

var sadb = new SimpleADB();

sadb.connect('192.168.1.5')
     .then(function () {
        sadb.reboot()
            .then(function () {
                console.log('rebooted');
            });
     })
     .catch(function (err) {
        console.log(err);
     });


```
### The SimpleADB Class

```js
var SimpleADB = require('simple-adb').SimpleADB;

var sadb = new SimpleADB({
        logger: null, // optional - if populated, should be a Bunyan instance.
        logLevel: 'error' | 'warn' | 'info', //optional, ignored if `logger` is populated
        path: '/path/to/adb' //optional, if you have a custom path, this may be required
    });
```

### SimpleADB Methods

N.B. All methods return a Promise.

```js
var SimpleADB = require('simple-adb').SimpleADB;

var sadb = new SimpleADB();

// to connect to a device (only one device can be connected to at a time)
sadb.connect(ipAddress);

// to disconnect device
sadb.disconnect();

// to reboot device
sadb.reboot();

// to shutdown device
sadb.shutdown();

// to force stop an application
sadb.forceStopApp(packageName);

// to start an application
sadb.startApp(packageName, launchName);

// to restart an application
sadb.restartApp(packageName. launchName);

// to perform any other task with adb
sadb.execAdbCommand(args); //args in an array of augements

// to perform any other shell task with adb
sadb.execAdbShellCommand(args); //args in an array of augements

// copy a file to the android device
sadb.push(fromPath, toPath);

// copy a file from the android device
sadb.pull(toPath, fromPath);

sadb.captureScreenshot(pathToSaveScreenshot); // path is optional, will store to home directory if no path given
```

## Tests

Coming soon

## Contribute
Please only edit the contents of the `src` directory as on publish this will be compiled into the `build` directory.
