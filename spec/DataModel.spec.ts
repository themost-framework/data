import {DataModel, EdmMapping, DataContext} from '../index';
import { TestApplication } from './TestApplication';
import { resolve } from 'path';
import { TestAdapter } from './adapter/TestAdapter';

class Employee {
    public EmployeeID?: number;
    public LastName?: string;
    public FirstName?: string;
    public BirthDate?: Date;
    public Photo?: string;
    public Notes?: string;
}
@EdmMapping.entityType('Employee')
class EmployeeModel {
    public EmployeeID?: number;
    public LastName?: string;
    public FirstName?: string;
    public BirthDate?: Date;
    public Photo?: string;
    public Notes?: string;
}

describe('DataModel', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test1'));
        return done();
    });
    beforeEach((done) => {
        context = app.createContext();
        return done();
    });
    afterEach((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });
    it('should get model', () => {
        let model = context.model('Employee');
        expect(model).toBeTruthy();
        // load by class
        model = context.model(Employee);
        expect(model).toBeTruthy();
        expect(model.name).toBe('Employee');
        model = context.model(EmployeeModel);
        expect(model).toBeTruthy();
        expect(model.name).toBe('Employee');
    });

    it('should get items', async () => {
        // load by class
        let model = context.model(Employee);
        const items = await model.getItems();
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
    });

    it('should get item', async () => {
        // load by class
        let item: Employee = await context.model(Employee).where('EmployeeID').equal(1).getItem();
        expect(item).toBeTruthy();
        expect(item.EmployeeID).toBe(1);
    });

    it('should use migrateAsync', async () => {
        const db: TestAdapter = context.db as TestAdapter;
        let exists = await db.table('OtherProducts').existsAsync();
        expect(exists).toBeFalsy();
        const upgraded = await context.model('OtherProduct').migrateAsync();
        expect(upgraded).toBeTruthy();
        exists = await db.table('OtherProducts').existsAsync();
        expect(exists).toBeTruthy();
        const configuration: any = app.getConfiguration();
        expect(configuration.cache).toBeInstanceOf(Object);
        const version = context.model('OtherProduct').version;
        expect(configuration.cache.OtherProduct).toEqual({
            version
        });
    });

});
