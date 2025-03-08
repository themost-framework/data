const { UserService } = require('./UserService');
const { DataApplication } = require('./data-application');
const { DataConfigurationStrategy } = require('./data-configuration');
const { createInstance } = require('@themost/sqlite');
const { DataCacheStrategy } = require('./data-cache');

/**
 * @type {import('@themost/common').DataModelProperties}
 */
const LocalUserServiceCache = {
    name: 'LocalUserServiceCache',
    version: '1.0.0',
    source: 'LocalUserServiceCache',
    view: 'LocalUserServiceCache',
    fields: [
        {
            name: 'key',
            type: 'Text',
            primary: true,
            nullable: false
        },
        {
            name: 'value',
            type: 'Json',
            nullable: true
        },
        {
            name: 'doomed',
            type: 'Boolean',
            nullable: true
        },
        {
            name: 'metadata',
            type: 'Json',
            many: false,
            nullable: true
        },
        {
            name: 'createdAt',
            type: 'DateTime',
            nullable: true
        },
        {
            name: 'expiresAt',
            type: 'DateTime',
            nullable: true
        }
    ]
}

class LocalUserService extends UserService {
    /**
     * @param {import('@themost/common').ApplicationBase} app
     */
    constructor(app) {
        super(app);

        this.cacheApplication = new DataApplication(__dirname);
        const configuration = this.cacheApplication.configuration.getStrategy(DataConfigurationStrategy);
        Object.assign(configuration.adapterTypes, {
            ['sqlite']: {
                invariantName: 'sqlite',
                name: 'sqlite',
                createInstance: createInstance
            }
        });
        configuration.adapters.push({
            name: 'user+service+cache',
            invariantName: 'sqlite',
            default: true,
            options: {
                database: ':memory:'
            }
        });
        configuration.setModelDefinition(LocalUserServiceCache);
        const context = this.cacheApplication.createContext();
        this.cache = context.model(LocalUserServiceCache.name);
        // remove unused services
    }

    /**
     * Get user by name
     * @param {import('./types').DataContext} context 
     * @param {string} name 
     * @returns 
     */
    async getUser(context, name) {
        let item = await this.cache.asQueryable().where('key').equal(name).getItem();
        if (item) {
            if (item.doomed) {
                await this.cache.remove(item);
            } else {
                return item.value;
            }
        }
        const user = await super.getUser(context, name);
        if (user) {
            await this.cache.insert({
                key: name,
                value: user,
                doomed: false,
                createdAt: new Date()
            });
            return user;
        }
        return null;
    }

    /**
     * Get anonymous user
     * @param {import('./types').DataContext} context 
     * @returns 
     */
    getAnonymousUser(context) {
        return super.getUser(context, 'anonymous');
    }

    /**
     * Finalize user service
     */
    async finalizeAsync() {
        await this.cache.context.finalizeAsync();
        const service = this.cacheApplication.getConfiguration().getStrategy(DataCacheStrategy);
        if (service != null && typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

}

module.exports = {
    LocalUserService
}