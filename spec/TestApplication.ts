import { IApplication, ConfigurationBase, ApplicationBase, ApplicationServiceConstructor } from "@themost/common";
import {resolve} from 'path';
import { DataConfigurationStrategy, NamedDataContext, DataContext } from '../index';

export class TestApplication extends ApplicationBase {
    useStrategy(serviceCtor: ApplicationServiceConstructor<any>, strategyCtor: ApplicationServiceConstructor<any>): this {
        const ServiceClass: any = serviceCtor;
        const StrategyClass: any = strategyCtor;
        this._services.set(ServiceClass.name, new StrategyClass(this));
        return this;
    }

    useService(serviceCtor: ApplicationServiceConstructor<any>): this {
       const ServiceClass: any = serviceCtor;
       this._services.set(ServiceClass.name, new ServiceClass(this));
       return this;
    }
    hasService<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean {
        return this._services.has((<any>serviceCtor).name);
    }
    getService<T>(serviceCtor: ApplicationServiceConstructor<T>): T {
        return this._services.get(serviceCtor.name);
    }

    private _services: Map<any,any> = new Map();
    private _configuration: ConfigurationBase;

    
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
        super(null);
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
        const adapters = this._configuration.getSourceAt('adapters');
        const adapter: { name: string; invariantName: string; default: boolean } = adapters.find((item: any)=> {
            return item.default;
        });
        const context = new NamedDataContext(adapter.name);
        context.getConfiguration = () => {
            return this._configuration;
        };
        return context;
    }

}