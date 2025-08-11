// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { IApplication, ConfigurationBase, 
    ApplicationService, ApplicationBase, ApplicationServiceConstructor, SequentialEventEmitter } from "@themost/common";
import {DataContext} from "./types";

export declare class DataApplication extends SequentialEventEmitter implements ApplicationBase {
    constructor(cwdOrConfig?: string | unknown);
    configuration: ConfigurationBase;    
    useStrategy(serviceCtor: ApplicationServiceConstructor<any>, strategyCtor: ApplicationServiceConstructor<any>): this;
    useService(serviceCtor: ApplicationServiceConstructor<any>): this;
    hasService<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean;
    getService<T>(serviceCtor: ApplicationServiceConstructor<T>): T;
    getConfiguration(): ConfigurationBase;
    createContext(): DataContext;
}