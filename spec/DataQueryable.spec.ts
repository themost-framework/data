import {DataModelFilterParser} from '../data-model-filter.parser';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';
import { UnknownAttributeError } from '../data-errors';
import { DataQueryable } from '../data-queryable';

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

    /**
     * @see https://github.com/themost-framework/data/issues/161
     */
    it('should validate where statement', async () => {
        const Orders = context.model('Order').silent();
        const items = await Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

    /**
     * @see https://github.com/themost-framework/data/issues/161
     */
    it('should validate where statement with error', async () => {
        const Orders = context.model('Order').silent();
        const q = Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10);
        expect(() => q.where('orderedItem/category').equal('Laptops')).toThrow('The where expression has already been initialized.');
    });

    /**
     * @see https://github.com/themost-framework/data/issues/161
     */
    it('should validate where statement after prepare', async () => {
        const Orders = context.model('Order').silent();
        const q = Orders.where('orderStatus/alternateName').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10);
        expect(() => q.prepare().where('orderedItem/category').equal('Laptops')).toBeTruthy();
    });

    it('should validate attribute name', async () => {
        const Orders = context.model('Order').silent();
        expect(() => {
            return Orders.where('orderStatus1').equal('OrderDelivered')
            .orderByDescending('orderDate').take(10);
        }).toThrow(new UnknownAttributeError('Order', 'orderStatus1'));
    });

    it('should validate attribute name on filter', async () => {
        const Orders = context.model('Order').silent();
        await expect(() => {
            return Orders.filterAsync('orderStatus1 eq 4');
        }).rejects.toThrow(new UnknownAttributeError('Order', 'orderStatus1'));
        await expect(() => {
            return Orders.filterAsync({
                $select: 'orderStatus1'
            });
        }).rejects.toThrow(new UnknownAttributeError('Order', 'orderStatus1'));
    });

    it('should validate nested attribute name', async () => {
        const Orders = context.model('Order').silent();
        await expect(
            Orders.filterAsync('orderStatus1/alternateName eq \'OrderDelivered\'')
        ).rejects.toThrow(new UnknownAttributeError('Order', 'orderStatus1'));

        await expect(
            Orders.filterAsync({
                $select: 'orderStatus1/alternateName'
            })
        ).rejects.toThrow(new UnknownAttributeError('Order', 'orderStatus1'));
    });

    it('should validate nested attribute inside method', async () => {
        const Orders = context.model('Order').silent();
        await expect(
            Orders.filterAsync('indexof(orderStatus/alternateName1, \'OrderDelivered\') eq 0')
        ).rejects.toThrow(new UnknownAttributeError('OrderStatusType', 'alternateName1'));
    });

    it('should validate nested attribute of a one-to-many association', async () => {
        const Products = context.model('Product').silent();
        await expect(
            Products.filterAsync('orders/orderStatus/alternateName1 eq \'OrderDelivered\'')
        ).rejects.toThrow(new UnknownAttributeError('OrderStatusType', 'alternateName1'));

        await expect(
            Products.filterAsync({
                $select: 'orders/orderStatus/alternateName1'
            })
        ).rejects.toThrow(new UnknownAttributeError('OrderStatusType', 'alternateName1'));
    });

    it('should validate nested attribute of a one-to-many association inside method', async () => {
        const Products = context.model('Product').silent();
        await expect(
            Products.filterAsync('indexof(orders/orderStatus/alternateName1, \'OrderDelivered\') eq 0')
        ).rejects.toThrow(new UnknownAttributeError('OrderStatusType', 'alternateName1'));
    });

    it('should validate nested attribute of a many-to-many association', async () => {
        const Products = context.model('Product').silent();
        await expect(
            Products.filterAsync('madeIn/name1 eq \'France\'')
        ).rejects.toThrow(new UnknownAttributeError('Country', 'name1'));
        await expect(
            Products.filterAsync({
                $select: 'madeIn/name1'
            })
        ).rejects.toThrow(new UnknownAttributeError('Country', 'name1'));
    });

    it('should validate method name', async () => {
        const Orders = context.model('Order').silent();
        await expect(Orders.filterAsync('createdBy eq me()')).resolves.toBeInstanceOf(DataQueryable);
    });

});
