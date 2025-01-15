import { DataApplication } from "../data-application";
import { DataCacheStrategy } from "../data-cache";
import { SqliteAdapter } from "@themost/sqlite";
import { DataConfigurationStrategy, SchemaLoaderStrategy } from "../data-configuration";
import path from 'path';
import { ConfigurationBase, DataModelProperties } from "@themost/common";

class MemoryCacheApplication extends DataApplication {
    constructor() {
        super(path.resolve(process.cwd(), '.cache'));
        const config = this.configuration.getStrategy(DataConfigurationStrategy);
        config.adapterTypes.set('sqlite', {
            name: 'sqlite',
            invariantName: 'sqlite',
            type: SqliteAdapter
        });
        config.adapters.push({
            name: 'cache',
            invariantName: 'sqlite',
            options: {
                database: ':memory:'
            }
        });
        const schema = this.getService(SchemaLoaderStrategy);
        schema.setModelDefinition({
            name: 'MemoryCache',
            title: 'Memory Cache',
            caching: 'none',
            version: '0.0.0',
            fields: [
                {
                    name: 'id',
                    type: 'Text',
                    primary: true,
                    nullable: false
                },
                {
                    name: 'additionalType',
                    type: 'Text'
                },
                {
                    name: 'value',
                    type: 'Text'
                },
                {
                    name: 'expiresAt',
                    type: 'DateTime'
                }
            ]
        } as DataModelProperties)
    }
}

class MemoryCacheStrategy extends DataCacheStrategy {
    
    protected cache: MemoryCacheApplication;

    constructor(config: ConfigurationBase) {
        super(config);
        this.cache = new MemoryCacheApplication();
    }

    get<T>(key: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

    add(key: string, value: any, absoluteExpiration?: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    remove(key: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    clear(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getOrDefault<T>(key: string, getFunc: () => Promise<T>, absoluteExpiration?: number): Promise<T> {
        throw new Error("Method not implemented.");
    }
}

export { MemoryCacheStrategy };