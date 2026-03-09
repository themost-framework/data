import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('Find', () => {

    let app: TestApplication;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should find object using a simple object graph', async () => {
        const item = await context.model('Product').find({
            name: 'Lenovo Yoga 2 Pro'
        }).getItem();
        expect(item).toBeDefined();
        expect(item.name).toEqual('Lenovo Yoga 2 Pro');
    });

    it('should find object using id', async () => {
        const item = await context.model('Product').find(39).getItem();
        expect(item).toBeDefined();
        expect(item.id).toEqual(39);
    });
    it('should find object using a unique constraint', async () => {
        const items = await context.model('Account').silent().find({
            name: 'alexis.rees@example.com'
        }).getItems();
        expect(items).toBeDefined();
        expect(items.length).toEqual(1);
        const [item] = items;
        expect(item.name).toEqual('alexis.rees@example.com');
    });

    it('should not find object', async () => {
        let item = await context.model('Product').find({}).getItem();
        expect(item).toBeUndefined();
        item = await context.model('Product').find({
            missingProperty: 'missingValue'
        }).getItem();
        expect(item).toBeUndefined();
        item = await context.model('Product').find({
            missingObject: {
                missingProperty: 'missingValue'
            }
        }).getItem();
        expect(item).toBeUndefined();
        item = await context.model('Product').find(null).getItem();
        expect(item).toBeUndefined();
    });

    it('should find objects using nested properties', async () => {
        const items = await context.model('Order').find({
            orderedItem: {
                name: 'Lenovo Yoga 2 Pro'
            }
        }).silent().expand('orderedItem').getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.orderedItem).toBeDefined();
            expect(item.orderedItem.name).toEqual('Lenovo Yoga 2 Pro');
        }
    });

    it('should find objects using customer data', async () => {
        const items = await context.model('Order').find({
            customer: {
                familyName: 'Thorpe',
                givenName: 'Luke'
            }
        }).silent().expand('customer').getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.customer).toBeDefined();
            expect(item.customer.familyName).toEqual('Thorpe');
            expect(item.customer.givenName).toEqual('Luke');
        }
    });

    it('should find objects using array values', async () => {
        const items = await context.model('Person').find({
            email: [
                'fernando.dunn@example.com',
                'eduardo.jordan@example.com'
            ]
        }).silent().getItems();
        expect(items.length).toEqual(2)
    });

    it('should find orders using address locality', async () => {
        const items = await context.model('Order').find({
            customer: {
                address: {
                    addressLocality: 'Exeter, Devon'
                }
            }
        }).silent().expand((x: any) => x.customer.address).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.customer.address).toBeDefined();
            expect(item.customer.address.addressLocality).toEqual('Exeter, Devon');
        }
    });

});
