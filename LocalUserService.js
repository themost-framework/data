const { UserService } = require('./UserService');
const { DataApplication } = require('./data-application');
const { DataConfigurationStrategy } = require('./data-configuration');
const { createInstance } = require('@themost/sqlite');
const { DataCacheStrategy } = require('./data-cache');
const { QueryExpression } = require('@themost/query');

/**
 * @type {import('@themost/common').DataModelProperties}
 */
const LocalUser = {
    name: 'LocalUser',
    version: '1.0.0',
    source: 'LocalUser',
    view: 'LocalUser',
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
        const cacheApplication = new DataApplication(__dirname);
        const configuration = cacheApplication.configuration.getStrategy(DataConfigurationStrategy);
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
        configuration.setModelDefinition(LocalUser);
        const context = cacheApplication.createContext();
        context.setApplication(cacheApplication);
        this.cache = context.model(LocalUser.name);
    }

    /**
     * Get user by name
     * @param {import('./types').DataContext} context 
     * @param {string} name 
     * @returns 
     */
    async getUser(context, name) {
        // upgrade cache if needed
        if (this.cache.upgraded !== true) {
            await this.cache.migrateAsync();
            this.cache.upgraded = true;
        }
        const select = this.cache.attributeNames;
        const [item] = await this.cache.context.db.executeAsync(
            new QueryExpression().select(
                ...select
            ).from(LocalUser.name).where('key').equal(name)
        );
        if (item) {
            if (item.doomed) {
                await this.removeUser(name);
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
     * Remove user by name
     * @param {string} name 
     */
    async removeUser(name) {
        await this.cache.context.db.executeAsync(
            new QueryExpression().delete(LocalUser.name).where('key').equal(name)
        );
    }

    /**
     * Finalize user service
     */
    async finalizeAsync() {
        if (this.cache == null) {
            return
        }
        if (this.cache.context == null) {
            return
        }
        const cacheApplication = this.cache.context.getApplication();
        await this.cache.context.finalizeAsync();
        const service = cacheApplication.getConfiguration().getStrategy(DataCacheStrategy);
        if (service != null && typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

}

module.exports = {
    LocalUserService
}