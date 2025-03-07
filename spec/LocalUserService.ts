import { ApplicationBase, DataModelProperties, TraceUtils } from "@themost/common";
import { UserService } from "../UserService";
import { DataApplication } from "../data-application";
import { DataConfigurationStrategy } from "../data-configuration";
import { createInstance } from "@themost/sqlite";
import { DataContext } from "../types";
import { DataModel } from "../data-model";
import { DataCacheStrategy, DataCacheFinalize } from "../data-cache";
import { performance } from "perf_hooks";

const LocalUserServiceCache: DataModelProperties = {
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
        }
    ]
}

class NoCacheStrategy extends DataCacheStrategy {

    async get(key: string): Promise<any> {
        return;
    }

    async add(key: string, value: any, absoluteExpiration?: number): Promise<any> {
        return;
    }

    async getOrDefault(key: string, getFunc: () => Promise<any>, absoluteExpiration?: number): Promise<any> {
        return getFunc();
    }

    async remove(key: string): Promise<any> {
        return;
    }

    async clear() {
        return;
    }

    async finalize() {
        return;
    }
}


class LocalUserService extends UserService {

    private cacheApplication: DataApplication;
    cache: DataModel;

  constructor(app: ApplicationBase) {
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

  async getUser(context: DataContext, name: string): Promise<any> {
    const start = performance.now();
    let item = await this.cache.asQueryable().where('key').equal(name).getItem();
    if (item) {
        if (item.doomed) {
            await this.cache.remove(item);
        } else {
            if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
                const end = performance.now();
                TraceUtils.log(`LocalUserService: Cache hit for user '${name}' in ${(end - start).toFixed(2)} ms.`);
            }
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

  getAnonymousUser(context: DataContext): Promise<any> {
    return super.getUser(context, 'anonymous');
  }

  async finalizeAsync() {
    await this.cache.context.finalizeAsync();
    const service = this.cacheApplication.getConfiguration().getStrategy(DataCacheStrategy) as unknown as DataCacheFinalize;
    if (typeof service.finalize === 'function') {
        await service.finalize();
    }
  }

}

export {
    LocalUserService
}