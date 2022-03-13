/**
 * @description An error for cancelling transaction in testing environments
 */
import {DataApplication} from '../../data-application';
import {DataCacheFinalize, DataCacheStrategy} from '../../data-cache';

export class CancelTransactionError extends Error {
    constructor() {
        super();
    }
}

export class TestUtils {
    /**
     * Wraps DataAdapter.executeInTransaction() for using in testing environments
     * @param {DataApplication} context
     * @param {Function} func
     * @returns {Promise<any>}
     */
    static executeInTransaction(context: any, func: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            // clear cache
            const configuration = context.getConfiguration();
            Object.defineProperty(configuration, 'cache', {
                configurable: true,
                enumerable: true,
                writable: true,
                value: { }
            });
            // start transaction
            context.db.executeInTransaction((cb: (err?: Error) => void) => {
                try {
                    func().then(() => {
                        return cb(new CancelTransactionError());
                    }).catch( (err: Error) => {
                        return cb(err);
                    });
                }
                catch (err) {
                    return cb(err);
                }

            }, (err: Error) => {
                // if error is an instance of CancelTransactionError
                if (err && err instanceof CancelTransactionError) {
                    return resolve();
                }
                if (err) {
                    return reject(err);
                }
                // exit
                return resolve();
            });
        });
    }

    static async finalize(app: DataApplication): Promise<void> {
        if (app == null) {
            return;
        }
        const service = app.getConfiguration().getStrategy(DataCacheStrategy) as unknown as DataCacheFinalize;
        if (typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

    static cancelTransaction() {
        throw new CancelTransactionError();
    }

}
