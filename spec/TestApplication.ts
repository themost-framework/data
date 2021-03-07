import { IApplication, ConfigurationBase } from "@themost/common";
import {resolve} from 'path';
import { DataConfigurationStrategy, NamedDataContext, DataContext } from '../index';

export class TestApplication extends IApplication {

    private _services: Map<any,any> = new Map();
    private _configuration: ConfigurationBase;

    useStrategy(serviceCtor: void, strategyCtor: void): this {
        const ServiceClass: any = serviceCtor;
        const StrategyClass: any = strategyCtor;
        this._services.set(ServiceClass.name, new StrategyClass(this));
        return this;
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
                'type': resolve(__dirname, 'adapter/TestAdapter')
            }
        ]);
        this._configuration.setSourceAt('adapters', [
            { 
                'name': 'test-storage',
                'invariantName': 'test',
                'default':true,
                "options": {
                }
            }
        ]);
        // use data configuration strategy
        this._configuration.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
    }

    createContext(): DataContext {
        const context = new NamedDataContext('test-storage');
        context.getConfiguration = () => {
            return this._configuration;
        };
        return context;
    }

}