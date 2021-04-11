# API
<a name="initFTPService"></a>

## initFTPService(services) ⇒ <code>Promise.&lt;FTPService&gt;</code>
Instantiate the FTP service

**Kind**: global function  
**Returns**: <code>Promise.&lt;FTPService&gt;</code> - A promise of the FTP service  

| Param | Type | Description |
| --- | --- | --- |
| services | <code>Object</code> | The services to inject |
| [services.ENV] | <code>Object</code> | An environment object |
| services.FTP | <code>function</code> | The configuration object as given to `basic-ftp`  client `access` method |
| services.FTP_CONFIG | <code>function</code> | The FTP service configuration object |
| [services.FTP_POOL] | <code>function</code> | The FTP pool configuration object as given to  `generic-pool`. |
| [services.FTP_TIMEOUT] | <code>function</code> | The FTP service timeout as given to `basic-ftp`  client constructor |
| [services.FTP_PASSWORD_ENV_NAME] | <code>function</code> | The environment variable name in which to pick-up the  FTP password |
| [services.log] | <code>function</code> | A logging function |
| [services.delay] | <code>function</code> | A service to manage delays |

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
