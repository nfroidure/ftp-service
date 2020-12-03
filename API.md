# API
<a name="initFTPService"></a>

## initFTPService(services) ⇒ <code>Promise.&lt;FTPService&gt;</code>
Instantiate the FTP service

**Kind**: global function  
**Returns**: <code>Promise.&lt;FTPService&gt;</code> - A promise of the FTP service  

| Param | Type | Description |
| --- | --- | --- |
| services | <code>Object</code> | The services to inject |
| services.FTP | <code>function</code> | The FTP service configuration object |
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
