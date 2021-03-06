import initFTPService from '.';
import { initDelayService } from 'common-services';
import { unlink, existsSync, writeFile } from 'fs';
import path from 'path';
import type { FTPConfig } from '.';

describe('FTP service', () => {
  const ENV = {};
  const CONFIG: FTPConfig = {
    FTP: {
      host: 'localhost',
      user: 'user',
      password: 'password',
    },
    FTP_TIMEOUT: 30000,
    FTP_POOL: {
      min: 0,
      max: 2,
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
    const delay = (await initDelayService({})).service;
    const ftp = await initFTPService({
      ...CONFIG,
      ENV,
      delay,
      log,
    });

    expect(ftp).toBeTruthy();
    expect({
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      Object {
        "logCalls": Array [],
      }
    `);
  });

  test('should list files', async () => {
    const delay = (await initDelayService({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      ENV,
      delay,
      log,
    });

    const files = await ftp.list('/');

    await dispose();

    expect({
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      Object {
        "files": Array [
          "testfile.txt",
        ],
        "logCalls": Array [
          Array [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          Array [
            "debug",
            "💾 - Listing files from FTP:",
            "/",
            1,
          ],
          Array [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
        ],
      }
    `);
  });

  test('should retrieve files', async () => {
    const delay = (await initDelayService({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      ENV,
      delay,
      log,
    });

    const fileContent = (await ftp.get('/testfile.txt')).toString();

    await dispose();

    expect({
      fileContent,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      Object {
        "fileContent": "This is a simple text file!",
        "logCalls": Array [
          Array [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          Array [
            "debug",
            "💾 - Retrieved a file from FTP:",
            "/testfile.txt",
            27,
          ],
          Array [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
        ],
      }
    `);
  });

  test('should send files', async () => {
    const delay = (await initDelayService({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      ENV,
      delay,
      log,
    });

    await ftp.put('/testfile2.txt', Buffer.from('plop'));

    const files = await ftp.list('/');

    const exists = existsSync(
      path.join(__dirname, '..', 'fixtures', 'testfile2.txt'),
    );

    await new Promise<void>((resolve, reject) => {
      unlink(path.join(__dirname, '..', 'fixtures', 'testfile2.txt'), (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    await dispose();

    expect({
      exists,
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      Object {
        "exists": true,
        "files": Array [
          "testfile.txt",
          "testfile2.txt",
        ],
        "logCalls": Array [
          Array [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          Array [
            "debug",
            "💾 - Sent a file to FTP:",
            "/testfile2.txt",
            4,
          ],
          Array [
            "debug",
            "💾 - Listing files from FTP:",
            "/",
            2,
          ],
          Array [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
        ],
      }
    `);
  });

  test('should delete files', async () => {
    const delay = (await initDelayService({})).service;
    const { service: ftp, dispose } = await initFTPService({
      ...CONFIG,
      ENV,
      delay,
      log,
    });

    await new Promise<void>((resolve, reject) => {
      writeFile(
        path.join(__dirname, '..', 'fixtures', 'testfile3.txt'),
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

    const exists = existsSync(
      path.join(__dirname, '..', 'fixtures', 'testfile3.txt'),
    );

    await dispose();

    expect({
      exists,
      files,
      logCalls: log.mock.calls,
    }).toMatchInlineSnapshot(`
      Object {
        "exists": false,
        "files": undefined,
        "logCalls": Array [
          Array [
            "debug",
            "💾 - FTP Successfully connected!",
          ],
          Array [
            "debug",
            "💾 - Deleted a file from FTP:",
            "/testfile3.txt",
          ],
          Array [
            "debug",
            "💾 - Shutting down the FTP pool.",
          ],
        ],
      }
    `);
  });
});
