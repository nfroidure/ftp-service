import path from 'path';
import { provider } from 'knifecycle';
import { createPool } from 'generic-pool';
import { Client as FTPClient } from 'basic-ftp';
import { PassThrough } from 'stream';
import { YError } from 'yerror';
import type { DelayService, LogService } from 'common-services';
import type { Pool } from 'generic-pool';
import type {
  ProviderInitializer,
  Dependencies,
  Service,
  Provider,
} from 'knifecycle';

export const DEFAULT_FTP_PASSWORD_ENV_NAME = 'FTP_PASSWORD';

export type FTP_ENV<
  T extends string extends T
    ? never
    : string = typeof DEFAULT_FTP_PASSWORD_ENV_NAME,
> = Record<T, string>;

export type FTPConfig<
  T extends string extends T
    ? never
    : string = typeof DEFAULT_FTP_PASSWORD_ENV_NAME,
> = {
  FTP: NonNullable<Parameters<InstanceType<typeof FTPClient>['access']>[0]>;
  FTP_CONFIG: {
    base: string;
    retry?: {
      delay: number;
      attempts: number;
    };
  };
  FTP_POOL?: Parameters<typeof createPool>[1];
  FTP_TIMEOUT?: ConstructorParameters<typeof FTPClient>[0];
  FTP_PASSWORD_ENV_NAME?: T;
};
export type FTPDependencies<
  T extends string extends T
    ? never
    : string = typeof DEFAULT_FTP_PASSWORD_ENV_NAME,
> = FTPConfig<T> & {
  ENV: FTP_ENV<T>;
  delay: DelayService;
  log: LogService;
};
export type FTPService = {
  list: (path: string) => Promise<string[]>;
  get: (path: string) => Promise<Buffer>;
  put: (path: string, data: string | Buffer) => Promise<void>;
  delete: (path: string) => Promise<void>;
};
type PoolFTPService = {
  client: FTPClient;
  isClosed: () => boolean;
  destroy: () => Promise<void>;
};

/* Architecture Note #1: FTP Service

The `ftp` service creates easily usable FTP features
 by exposing `list`, `put`, `get` and `delete`
 methods and handling any unecessary complexity.
*/

export default provider(
  initFTPService as ProviderInitializer<Dependencies, Service>,
  'ftp',
  [
    'FTP',
    'FTP_CONFIG',
    '?FTP_POOL',
    '?FTP_TIMEOUT',
    '?FTP_PASSWORD_ENV_NAME',
    '?ENV',
    'delay',
    'log',
  ],
) as typeof initFTPService;

/**
 * Instantiate the FTP service
 * @name initFTPService
 * @function
 * @param  {Object}     services
 * The services to inject
 * @param  {Object}   [services.ENV]
 * An environment object
 * @param  {Function}   services.FTP
 * The configuration object as given to `basic-ftp`
 *  client `access` method
 * @param  {Function}   services.FTP_CONFIG
 * The FTP service configuration object
 * @param  {Function}   [services.FTP_POOL]
 * The FTP pool configuration object as given to
 *  `generic-pool`.
 * @param  {Function}   [services.FTP_TIMEOUT]
 * The FTP service timeout as given to `basic-ftp`
 *  client constructor
 * @param  {Function}   [services.FTP_PASSWORD_ENV_NAME]
 * The environment variable name in which to pick-up the
 *  FTP password
 * @param  {Function}   services.log
 * A logging function
 * @param  {Function}   [services.delay]
 * A service to manage delays
 * @return {Promise<FTPService>}
 * A promise of the FTP service
 * @example
 * import initFTPService from 'ftp-service';
 * import { initDelayService } from 'common-services';
 *
 * const delay = await initDelayService({
 *   log: console.log.bind(console),
 * })
 * const fpt = await initFTPService({
 *   FTP: {
 *     host: 'localhost',
 *     user: 'user',
 *     pasword: 'pwd',
 *   },
 *   FTP_CONFIG: { base: '' },
 *   ENV: process.env,
 *   delay,
 *   log: console.log.bind(console),
 * });
 *
 * const files = await ftp.list('/');
 */
async function initFTPService<
  T extends string extends T
    ? never
    : string = typeof DEFAULT_FTP_PASSWORD_ENV_NAME,
>({
  FTP,
  FTP_CONFIG,
  FTP_POOL,
  FTP_TIMEOUT,
  FTP_PASSWORD_ENV_NAME = DEFAULT_FTP_PASSWORD_ENV_NAME as T,
  ENV,
  delay,
  log,
}: FTPDependencies<T>): Promise<Provider<FTPService>> {
  /* Architecture Note #1.1: Pool
  
  The service uses a pool to allow several parallel connections
   to a FTP server.
  */
  const pool = createPool<PoolFTPService>(
    {
      create: async () => {
        try {
          const ftpClient = new FTPClient(FTP_TIMEOUT);

          await ftpClient.access({
            ...FTP,
            ...(ENV[FTP_PASSWORD_ENV_NAME]
              ? { password: ENV[FTP_PASSWORD_ENV_NAME] }
              : {}),
          });

          const finalFTPClient: PoolFTPService = {
            client: ftpClient,
            destroy: async () => {
              await ftpClient.close();
            },
            isClosed: () => ftpClient.closed,
          };

          log('debug', '💾 - FTP Successfully connected!');

          return finalFTPClient;
        } catch (err) {
          log(
            'error',
            '💾 - FTP connection failure:',
            (err as Error).stack as string,
          );
          throw YError.wrap(err as Error, 'E_FTP_CONNECT');
        }
      },
      validate: async (finalFTPClient) => !finalFTPClient.isClosed(),
      destroy: async (finalFTPClient) => {
        try {
          log('debug', '💾 - Disconnecting a FTP service instance.');
          await finalFTPClient.destroy();
        } catch (err) {
          const wrappedErr = YError.wrap(err as Error, 'E_FTP_DISCONNECT');
          log(
            'error',
            '💾 - FTP disconnection failure:',
            wrappedErr.stack as string,
          );
          throw wrappedErr;
        }
      },
    },
    FTP_POOL,
  );

  const ftp: FTPService = {
    list: async (filePath): Promise<string[]> => {
      try {
        return await doFTPWork(
          { FTP, FTP_CONFIG, delay, log },
          pool,
          async (ftpClient: PoolFTPService): Promise<string[]> => {
            const files = await ftpClient.client.list(
              FTP_CONFIG.base + filePath,
            );

            log(
              'debug',
              '💾 - Listing files from FTP:',
              FTP_CONFIG.base + filePath,
              files.length,
            );
            return files.map((fileInfo) => fileInfo.name);
          },
        );
      } catch (err) {
        throw YError.wrap(
          err as Error,
          'E_FTP_GET',
          FTP.host,
          FTP_CONFIG.base + filePath,
        );
      }
    },
    get: async (filePath): Promise<Buffer> => {
      try {
        return await doFTPWork(
          { FTP, FTP_CONFIG, delay, log },
          pool,
          async (ftpClient: PoolFTPService) => {
            const stream = new PassThrough();

            const [data] = await Promise.all([
              new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];

                stream.once('end', () => resolve(Buffer.concat(chunks)));
                stream.once('error', reject);
                stream.on('readable', () => {
                  let data: Buffer;
                  while ((data = stream.read())) {
                    chunks.push(data);
                  }
                });
              }),
              ftpClient.client.downloadTo(stream, FTP_CONFIG.base + filePath),
            ]);

            log(
              'debug',
              '💾 - Retrieved a file from FTP:',
              FTP_CONFIG.base + filePath,
              data.length,
            );
            return data;
          },
        );
      } catch (err) {
        throw YError.wrap(
          err as Error,
          'E_FTP_GET',
          FTP.host,
          FTP_CONFIG.base + filePath,
        );
      }
    },
    put: async (filePath, data) => {
      try {
        return await doFTPWork(
          { FTP, FTP_CONFIG, delay, log },
          pool,
          async (ftpClient: PoolFTPService) => {
            if ('/' !== path.dirname(FTP_CONFIG.base + filePath)) {
              await ftpClient.client.ensureDir(
                path.dirname(FTP_CONFIG.base + filePath),
              );
            }

            const stream = new PassThrough();

            const uploadPromise = ftpClient.client.uploadFrom(
              stream,
              FTP_CONFIG.base + filePath,
            );

            stream.write(data);
            stream.end();

            await uploadPromise;

            log(
              'debug',
              '💾 - Sent a file to FTP:',
              FTP_CONFIG.base + filePath,
              data.length,
            );
          },
        );
      } catch (err) {
        throw YError.wrap(
          err as Error,
          'E_FTP_PUT',
          FTP.host,
          FTP_CONFIG.base + filePath,
        );
      }
    },
    delete: async (filePath: string, ignoreErrors = true): Promise<void> => {
      try {
        return await doFTPWork(
          { FTP, FTP_CONFIG, delay, log },
          pool,
          async (ftpClient: PoolFTPService): Promise<void> => {
            await ftpClient.client.remove(
              FTP_CONFIG.base + filePath,
              ignoreErrors,
            );

            log(
              'debug',
              '💾 - Deleted a file from FTP:',
              FTP_CONFIG.base + filePath,
            );
          },
        );
      } catch (err) {
        throw YError.wrap(
          err as Error,
          'E_FTP_GET',
          FTP.host,
          FTP_CONFIG.base + filePath,
        );
      }
    },
  };

  return {
    service: ftp,
    dispose: async () => {
      log('debug', '💾 - Shutting down the FTP pool.');
      await pool.drain();
      pool.clear();
    },
  };
}

/* Architecture Note #1.2: Retry and error casting

One can configure the FTP service to retry several times
 before abandonnating the requested operation.
*/
async function doFTPWork<
  R,
  T extends (ftpClient: PoolFTPService) => Promise<R>,
>(
  {
    FTP,
    FTP_CONFIG,
    delay,
    log,
  }: {
    FTP: FTPConfig['FTP'];
    FTP_CONFIG: FTPConfig['FTP_CONFIG'];
    delay: DelayService;
    log: LogService;
  },
  pool: Pool<PoolFTPService>,
  fn: T,
  attempts = 0,
): Promise<R> {
  let finalErr: Error | undefined = undefined;
  let ftpClient: PoolFTPService | undefined = undefined;

  try {
    try {
      ftpClient = await pool.acquire();
    } catch (err) {
      throw YError.wrap(err as Error, 'E_FTP_CONNECT', FTP.host);
    }
    return await fn(ftpClient);
  } catch (err) {
    finalErr = err as Error;
  } finally {
    try {
      if (finalErr) {
        await pool.destroy(ftpClient as PoolFTPService);
      } else {
        await pool.release(ftpClient as PoolFTPService);
      }
    } catch (releaseErr) {
      const wrappedReleaseErr = YError.wrap(
        releaseErr as Error,
        'E_FTP_RELEASE',
        FTP.host,
      );
      log('error', '💾 - Could not release the FTP client.');
      log('error-stack', wrappedReleaseErr.stack as string);
      finalErr = finalErr || wrappedReleaseErr;
    }
  }
  if (finalErr) {
    if (FTP_CONFIG.retry && attempts < FTP_CONFIG.retry.attempts) {
      log(
        'info',
        `💾 - Retrying an FTP work (attempt ${attempts + 1}/${
          FTP_CONFIG.retry.attempts
        })`,
      );
      log('debug-stack', finalErr.stack as string);
      await delay.create(FTP_CONFIG.retry.delay || 0);
      return doFTPWork({ FTP, FTP_CONFIG, delay, log }, pool, fn, attempts + 1);
    }
    throw YError.wrap(finalErr, 'E_FTP_PUT', FTP.host);
  }
  // Not supposed to reach that code
  throw new YError('E_FTP_ERROR');
}
