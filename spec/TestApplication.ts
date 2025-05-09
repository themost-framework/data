import { IApplication, ConfigurationBase, ApplicationServiceConstructor, ApplicationBase } from "@themost/common";
import {resolve} from 'path';
import * as fs from 'fs';
import {
    DataConfigurationStrategy,
    NamedDataContext,
    DataContext,
    DataApplication,
    DataCacheStrategy,
    DataCacheFinalize
} from '../index';

export class TestApplication extends DataApplication {
    
    constructor(executionPath: string) {
        super(executionPath);
        this.configuration.setSourceAt('adapterTypes', [
            {
                'name':'Test Data Adapter',
                'invariantName': 'test',
                'type': '@themost/sqlite'
            }
        ]);
        // check if test.db exists
        const db = resolve(executionPath, 'db', 'test.db');
        if (fs.existsSync(db)) {
            // and remove it
            fs.unlinkSync(db);
        }
        // check if local.db exists
        const local = resolve(executionPath, 'db', 'local.db');
        if (fs.existsSync(local)) {
            // copy local.db to test.db
            fs.copyFileSync(local, db)
        }
        this.configuration.setSourceAt('adapters', [
            { 
                'name': 'test-storage',
                'invariantName': 'test',
                'default':true,
                "options": {
                    "database": db
                }
            }
        ]);
        // use data configuration strategy
        this.configuration.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
    }

    createContext(): DataContext {
        const adapters = this.configuration.getSourceAt('adapters');
        const adapter: { name: string; invariantName: string; default: boolean } = adapters.find((item: any)=> {
            return item.default;
        });
        const context = new NamedDataContext(adapter.name);
        context.setApplication(this);
        context.getConfiguration = () => {
            return this.configuration;
        };
        return context;
    }

    async finalize(): Promise<void> {
        const service = this.getConfiguration().getStrategy(DataCacheStrategy) as unknown as DataCacheFinalize;
        if (typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

}
