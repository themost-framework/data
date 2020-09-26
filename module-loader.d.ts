// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
export declare abstract class ModuleLoader {
    abstract require(modulePath: string): any;

}

export declare class DefaultModuleLoader extends  ModuleLoader {
    constructor(executionPath: string);
    getExecutionPath(): string;
    require(modulePath: string): any;

}
