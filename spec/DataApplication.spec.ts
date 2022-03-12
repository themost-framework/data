import {DataApplication} from '../data-application';
import { ApplicationService, ApplicationBase } from '@themost/common';
import {resolve} from 'path';
import {DataCacheStrategy} from '../data-cache';

class Service1 extends ApplicationService {
    constructor(app: ApplicationBase) {
        super(app);
    }
    getMessage() {
        return 'Hello World';
    }
}

class Strategy1 extends ApplicationService {
    constructor(app: ApplicationBase) {
        super(app);
    }
    getMessage() {
        return 'Hello World!!!';
    }
}

describe('DataApplication', () => {

    let cwd = resolve(__dirname, 'test1');

    it('should create instance', () => {
        const app = new DataApplication(cwd);
        expect(app).toBeTruthy();
        app.getService(DataCacheStrategy).clear();
    });
    it('should get configuration', () => {
        const app = new DataApplication(cwd);
        expect(app.getConfiguration()).toBeTruthy();
        expect(app.configuration).toBeTruthy();
    });
    it('should use service', () => {
        const app = new DataApplication(cwd);
        expect(app.hasService(Service1)).toBeFalsy();
        app.useService(Service1);
        const service = app.getService<Service1>(Service1);
        expect(service).toBeTruthy();
        expect(app.hasService(Service1)).toBeTruthy();
        expect(service.getMessage()).toBe('Hello World');
    });
    it('should use strategy', () => {
        const app = new DataApplication(cwd);
        app.useService(Service1);
        let service = app.getService<Service1>(Service1);
        expect(service).toBeTruthy();
        expect(service.getMessage()).toBe('Hello World');
        app.useStrategy(Service1, Strategy1);
        service = app.getService<Service1>(Service1);
        expect(service).toBeTruthy();
        expect(service.getMessage()).toBe('Hello World!!!');
    });

    it('should use context', async () => {
        const app = new DataApplication(cwd);
        const context = app.createContext();
        expect(context).toBeTruthy();
        const Products = context.model('Product');
        expect(Products).toBeTruthy();
        await context.finalize();
    });
});
