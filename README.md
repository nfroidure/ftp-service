[//]: # ( )
[//]: # (This file is automatically generated by a `metapak`)
[//]: # (module. Do not change it  except between the)
[//]: # (`content:start/end` flags, your changes would)
[//]: # (be overridden.)
[//]: # ( )
# ftp-service
> A simple wrapper for a simpler FTP client surface API with pool and retry management.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/nfroidure/ftp-service/blob/master/LICENSE)
[![Coverage Status](https://coveralls.io/repos/github/nfroidure/ftp-service/badge.svg?branch=master)](https://coveralls.io/github/nfroidure/ftp-service?branch=master)
[![NPM version](https://badge.fury.io/js/ftp-service.svg)](https://npmjs.org/package/ftp-service)
[![Dependency Status](https://david-dm.org/nfroidure/ftp-service.svg)](https://david-dm.org/nfroidure/ftp-service)
[![devDependency Status](https://david-dm.org/nfroidure/ftp-service/dev-status.svg)](https://david-dm.org/nfroidure/ftp-service#info=devDependencies)
[![Package Quality](https://npm.packagequality.com/shield/ftp-service.svg)](https://packagequality.com/#?package=ftp-service)
[![Code Climate](https://codeclimate.com/github/nfroidure/ftp-service.svg)](https://codeclimate.com/github/nfroidure/ftp-service)


[//]: # (::contents:start)

This wrapper is directly usable with [Knifecycle](https://github.com/nfroidure/knifecycle).

[//]: # (::contents:end)

# API
<a name="initFTPService"></a>

## initFTPService(services) ⇒ <code>Promise.&lt;FTPService&gt;</code>
Instantiate the FTP service

**Kind**: global function  
**Returns**: <code>Promise.&lt;FTPService&gt;</code> - A promise of the FTP service  

| Param | Type | Description |
| --- | --- | --- |
| services | <code>Object</code> | The services to inject |
| services.FTP | <code>function</code> | The configuration object as given to `basic-ftp`  client `access` method |
| services.FTP_CONFIG | <code>function</code> | The FTP service configuration object |
| [services.FTP_POOL] | <code>function</code> | The FTP pool configuration object as given to  `generic-pool`. |
| services.FTP_TIMEOUT | <code>function</code> | The FTP service timeout as given to `basic-ftp`  client constructor |
| [services.FTP_PASSWORD_ENV_NAME] | <code>function</code> | The environment variable name in which to pick-up the  FTP password |
| [services.log] | <code>function</code> | A logging function |
| [services.time] | <code>function</code> | A function returning the current timestamp |

**Example**  
```js
import initFTPService from 'ftp-service';
import { initDelayService } from 'common-services';

const delay = await initDelayService({
  log: console.log.bind(console),
})
const jwt = await initFTPService({
  FTP: {
    host: 'localhost',
    user: 'user',
    pasword: 'pwd',
  },
  FTP_CONFIG: { base: '' },
  delay,
  log: console.log.bind(console),
});

const files = await ftp.list('/);
```

# Authors
- [Nicolas Froidure](https://insertafter.com/en/index.html)

# License
[MIT](https://github.com/nfroidure/ftp-service/blob/master/LICENSE)
