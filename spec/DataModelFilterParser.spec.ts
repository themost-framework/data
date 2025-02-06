import {DataModelFilterParser} from '../data-model-filter.parser';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';
import { TestUtils } from "./adapter/TestUtils";

describe('DataModelFilterParser', () => {

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

    it('should parse filter statement', async () => {
        const Orders = context.model('Order').silent();
        const resolver = new DataModelFilterParser(Orders);
        const { $where, $expand } = await resolver.parseAsync(
            `orderStatus/alternateName eq 'OrderDelivered' and orderedItem/category eq 'Laptops'`
        );
        const q = Orders.asQueryable();
        Object.assign(q.query, {
            $where,
            $expand
        });
        const items: { orderStatus: any, orderedItem: { category: string } }[] = await q.take(25).getItems();
        expect(items).toBeTruthy();
        for (const item of items) {
            const { orderStatus, orderedItem } = item;
            expect(orderStatus.alternateName).toEqual('OrderDelivered');
            expect(orderedItem.category).toEqual('Laptops');
        }
    });

    it('should parse filter statement and execute native query', async () => {
        const Orders = context.model('Order').silent();
        const resolver = new DataModelFilterParser(Orders);
        const { $where, $expand } = await resolver.parseAsync(
            `orderStatus/alternateName eq 'OrderDelivered' and orderedItem/category eq 'Laptops'`
        );
        const q = Orders.asQueryable();
        Object.assign(q.query, {
            $where,
            $expand
        });
        const { id: orderStatus} = await context.model('OrderStatusType')
            .find({ alternateName: 'OrderDelivered' }).getItem();
        q.select();
        const items: any[] = await new Promise((resolve, reject) => {
            void context.db.execute(q.query, [], (err, items) => {
                if (err) {
                    return reject(err);
                }
                return resolve(items);
            });
        });
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.orderStatus).toEqual(orderStatus);
        }
    });

    it('should parse filter statement with previous state', async () => {
        const Orders = context.model('Order').silent();
        const resolver = new DataModelFilterParser(Orders);
        const { $where, $expand } = await resolver.parseAsync(
            `orderStatus/alternateName eq 'OrderDelivered' and orderedItem/category eq 'Laptops'`
        );
        const q = Orders.asQueryable();
        Object.assign(q.query, {
            $where,
            $expand
        });
        const { id: orderStatus} = await context.model('OrderStatusType')
            .find({ alternateName: 'OrderDelivered' }).getItem();
        q.select();
        const items: any[] = await new Promise((resolve, reject) => {
            void context.db.execute(q.query, [], (err, items) => {
                if (err) {
                    return reject(err);
                }
                return resolve(items);
            });
        });
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.orderStatus).toEqual(orderStatus);
        }
    });

    it('should parse filter with json attributes', async () => {
        await TestUtils.executeInTransaction(context, async () => {
           const Products = context.model('Product').silent();
            const resolver = new DataModelFilterParser(Products);
            const { $where, $expand } = await resolver.parseAsync(
                `metadata/color eq 'silver'`
            );
            const q = Products.asQueryable();
            Object.assign(q.query, {
                $where,
                $expand
            });
            const items: any[] = await q.take(25).getItems();
            expect(items).toBeTruthy();
        });
    });


    it('should parse select filter with expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            delete context.user;
            const Orders = context.model('Order');
            let q = await Orders.filterAsync({
                $select: 'orderedItem/name as product,round(orderedItem/price,2) as price, max(orderDate) as lastOrderDate',
                $filter: 'orderedItem/category eq \'Laptops\'',
                $orderBy: 'orderedItem/price desc',
                $groupBy: 'orderedItem/name,orderedItem/price'
            })
            let items: {product: string, price: number, lastOrderDate: Date}[] = await q.take(25).getItems();
            expect(items.length).toBeFalsy();
            context.user = {
                name: 'aaron.matthews@example.com'
            }
            q = await Orders.filterAsync({
                $select: 'orderedItem/name as product,round(orderedItem/price,2) as price, max(orderDate) as lastOrderDate',
                //$filter: 'orderedItem/category eq \'Laptops\'',
                $orderBy: 'orderedItem/price desc',
                $groupBy: 'orderedItem/name,orderedItem/price'
            })
            items = await q.getItems();
            expect(items.length).toBeTruthy();
            // get orders
            const orders = await context.model('Order').select(
                'orderedItem/name as product',
                'orderDate'
            ).getItems();
            for (const item of items) {
                const order = orders.sort((a, b) => {
                    return a.orderDate < b.orderDate ? 1 : -1;
                }).find(o => o.product === item.product);
                expect(order).toBeTruthy();
                expect(order.orderDate).toEqual(item.lastOrderDate);
            }
        });
    });

});
