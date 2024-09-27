import {DataModelFilterParser} from '../data-model-filter.parser';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';

describe('DataQueryable', () => {

    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should validate where statement', async () => {
        const Orders = context.model('Order').silent();
        const items = await Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should validate where statement with error', async () => {
        const Orders = context.model('Order').silent();
        const q = Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10);
        expect(() => q.where('orderedItem/category').equal('Laptops')).toThrow('The where expression has already been initialized.');
    });

    it('should validate where statement after prepare', async () => {
        const Orders = context.model('Order').silent();
        const q = Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10);
        expect(() => q.prepare().where('orderedItem/category').equal('Laptops')).toBeTruthy();
    });

});
