import { describe, test, beforeEach, jest, expect } from '@jest/globals';
import initFTPService from './index.js';
import { initDelay } from 'common-services';
import { unlink, existsSync, writeFile } from 'fs';
import path from 'path';
import type { FTPConfig } from './index.js';

describe('FTP service', () => {
  const CONFIG: FTPConfig = {
    FTP: {
      host: process.env.FTP_HOST || 'localhost',
      port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : 21,
      user: 'user',
    },
    FTP_TIMEOUT: 30000,
    FTP_POOL: {
      min: 0,
      max: 1,
      maxWaitingClients: 10,
      evictionRunIntervalMillis: 20,
    },
    FTP_CONFIG: {
      base: '',
    },
  };
  const log = jest.fn();

  beforeEach(() => {
    log.mockReset();
  });

  test('should init well', async () => {
    const delay = (await initDelay({})).service;
    const ftp = await initFTPService({
      ...CONFIG,
      ENV: { FTP_PASSWORD: 'password' },
      delay,
      log,
    });

    expect(ftp).toBeTruthy();
    expect({
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "logCalls": [],
      }
    `);

    ftp.dispose && (await ftp.dispose());
  });

  test('should list files', async () => {
    const delay = (await initDelay({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      FTP_PASSWORD_ENV_NAME: 'FTP_PASSWORD2',
      ENV: { FTP_PASSWORD2: 'password' },
      delay,
      log,
    });

    const files = await ftp.list('/');

    dispose && (await dispose());

    expect({
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "files": [
          "testfile.txt",
        ],
        "logCalls": [
          [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          [
            "debug",
            "💾 - Listing files from FTP:",
            "/",
            1,
          ],
          [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
          [
            "debug",
            "💾 - Disconnecting a FTP service instance.",
          ],
        ],
      }
    `);
  });

  test('should retrieve files', async () => {
    const delay = (await initDelay({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...{
        ...CONFIG,
        FTP: {
          ...CONFIG.FTP,
          password: 'password',
        },
      },
      delay,
      log,
    });

    const fileContent = (await ftp.get('/testfile.txt')).toString();

    dispose && (await dispose());

    expect({
      fileContent,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
{
  "fileContent": "This is a simple text file!",
  "logCalls": [
    [
      "warning",
      "⚠️ - Setting the password in the FTP config is unsafe.",
    ],
    [
      "debug",
      "💾 - FTP Successfully connected!",
    ],
    [
      "debug",
      "💾 - Retrieved a file from FTP:",
      "/testfile.txt",
      27,
    ],
    [
      "debug",
      "💾 - Shutting down the FTP pool.",
    ],
    [
      "debug",
      "💾 - Disconnecting a FTP service instance.",
    ],
  ],
}
`);
  });

  test('should send files', async () => {
    const delay = (await initDelay({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      FTP_PASSWORD_ENV_NAME: 'FTP_PASSWORD',
      ENV: { FTP_PASSWORD: 'password' },
      delay,
      log,
    });

    await ftp.put('/testfile2.txt', Buffer.from('plop'));

    const files = await ftp.list('/');

    const exists = existsSync(path.join('.', 'fixtures', 'testfile2.txt'));

    await new Promise<void>((resolve, reject) => {
      unlink(path.join('.', 'fixtures', 'testfile2.txt'), (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    dispose && (await dispose());

    expect({
      exists,
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "exists": true,
        "files": [
          "testfile.txt",
          "testfile2.txt",
        ],
        "logCalls": [
          [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          [
            "debug",
            "💾 - Sent a file to FTP:",
            "/testfile2.txt",
            4,
          ],
          [
            "debug",
            "💾 - Listing files from FTP:",
            "/",
            2,
          ],
          [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
          [
            "debug",
            "💾 - Disconnecting a FTP service instance.",
          ],
        ],
      }
    `);
  });

  test('should delete files', async () => {
    const delay = (await initDelay({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      FTP_PASSWORD_ENV_NAME: 'FTP_PASSWORD',
      ENV: { FTP_PASSWORD: 'password' },
      delay,
      log,
    });

    await new Promise<void>((resolve, reject) => {
      writeFile(
        path.join('.', 'fixtures', 'testfile3.txt'),
        'hello!',
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        },
      );
    });

    const files = await ftp.delete('/testfile3.txt');

    const exists = existsSync(path.join('.', 'fixtures', 'testfile3.txt'));

    dispose && (await dispose());

    expect({
      exists,
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "exists": false,
        "files": undefined,
        "logCalls": [
          [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          [
            "debug",
            "💾 - Deleted a file from FTP:",
            "/testfile3.txt",
          ],
          [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
          [
            "debug",
            "💾 - Disconnecting a FTP service instance.",
          ],
        ],
      }
    `);
  });
});
