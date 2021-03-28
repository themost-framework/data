import {DataModel, EdmMapping, DataContext, DataObject} from '../index';
import { TestApplication } from './TestApplication';
import { resolve } from 'path';

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

class Product {
    public ProductID?: number;
    public ProductName?: string;
    public Supplier?: any;
    public Category?: any;
    public Unit?: string;
    public Price?: number;
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

    it('should get typed items', async () => {
        // load by class
        let model = context.model(Employee);
        const items = await model.getTypedItems();
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
        const first = items[0];
        expect(first).toBeInstanceOf(DataObject);
    });

    it('should get item', async () => {
        // load by class
        let item: Employee = await context.model(Employee).where('EmployeeID').equal(1).getItem();
        expect(item).toBeTruthy();
        expect(item.EmployeeID).toBe(1);
    });

    it('should get item by a nested object', async () => {
        let items = await context.model(Product)
            .where('Supplier/SupplierName').equal('Exotic Liquid').getItems();
        expect(items.length).toBeGreaterThan(0);

        items = await context.model(Product)
            .where('Supplier/SupplierName').equal('Exotic Liquid')
            .and('Category/CategoryName').equal('Condiments')
            .expand('Category', 'Supplier')
            .getItems();
        expect(items.length).toBeGreaterThan(0);
        items.forEach((item) => {
            expect(item.Supplier.SupplierName).toBe('Exotic Liquid');
            expect(item.Category.CategoryName).toBe('Condiments');
        });
    });

    it('should get item by querying child object', async () => {
        let item = await context.model('Category')
            .where('Products/ProductName').equal('Northwoods Cranberry Sauce').getItem();
        expect(item).toBeTruthy();
        expect(item.CategoryName).toBe('Condiments');
    });

});
