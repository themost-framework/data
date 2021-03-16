// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved
import { IApplication, ConfigurationBase, 
    ApplicationService, ApplicationBase, ApplicationServiceConstructor } from "@themost/common";
import {DataContext} from "./types";

export declare class DataApplication implements ApplicationBase {
    constructor(cwd?: string);
    configuration: ConfigurationBase;    
    useStrategy(serviceCtor: ApplicationServiceConstructor<any>, strategyCtor: ApplicationServiceConstructor<any>): this;
    useService(serviceCtor: ApplicationServiceConstructor<any>): this;
    hasService<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean;
    getService<T>(serviceCtor: ApplicationServiceConstructor<T>): T;
    getConfiguration(): ConfigurationBase;
    createContext(): DataContext;
}