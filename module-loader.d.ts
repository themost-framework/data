// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
export declare abstract class ModuleLoader {
    abstract require(modulePath: string): any;
    static parseRequire(anyPath: string): { path: string; member?: string };
}

export declare class DefaultModuleLoader extends  ModuleLoader {
    constructor(executionPath: string);
    getExecutionPath(): string;
    require(modulePath: string): any;

}
