import {IApplication, ConfigurationBase, ApplicationServiceConstructor} from "@themost/common";
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

export class TestApplication extends IApplication {

    private _services: Map<any,any> = new Map();
    private _configuration: ConfigurationBase;

    useStrategy(serviceCtor: void, strategyCtor: void): this {
        const ServiceClass: any = serviceCtor;
        const StrategyClass: any = strategyCtor;
        this._services.set(ServiceClass.name, new StrategyClass(this));
        return this;
    }
    useService<T>(serviceCtor: ApplicationServiceConstructor<any>): this {
        const ServiceClass: any = serviceCtor;
        this._services.set(ServiceClass.name, new ServiceClass(this));
        return this;
    }
    getService<T>(serviceCtor: () => T): T {
        return this._services.get((<any>serviceCtor).name);
    }
    hasStrategy(serviceCtor: void): boolean {
        return this._services.has((<any>serviceCtor).name);
    }
    getStrategy<T>(serviceCtor: new () => T): T {
        return this._services.get(serviceCtor.name);
    }
    getConfiguration(): ConfigurationBase {
        return this._configuration;
    }
    constructor(executionPath: string) {
        super();
        // init application configuration
        this._configuration = new ConfigurationBase(resolve(executionPath, 'config'));
        this._configuration.setSourceAt('adapterTypes', [
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
        this._configuration.setSourceAt('adapters', [
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
        this._configuration.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
    }

    createContext(): DataContext {
        const adapters = this._configuration.getSourceAt('adapters');
        // @ts-ignore
        const adapter: { name: string; invariantName: string; default: boolean } = adapters.find((item: any)=> {
            return item.default;
        });
        const context = new NamedDataContext(adapter.name);
        context.getConfiguration = () => {
            return this._configuration;
        };
        context.setApplication(this);
        return context;
    }

    async finalize(): Promise<void> {
        // @ts-ignore
        const service = this.getConfiguration().getStrategy(DataCacheStrategy) as unknown as DataCacheFinalize;
        if (typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

}
