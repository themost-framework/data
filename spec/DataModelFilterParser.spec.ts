import {DataModelFilterParser} from '../data-model-filter.parser';
import {DataQueryable, SelectObjectQuery} from '@themost/data';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';
import { TestUtils } from "./adapter/TestUtils";
import get from 'lodash/get';
import {MemberExpression, QueryExpression, QueryField, QueryValueRef} from '@themost/query';

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

    it('should parse filter with $previous expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            const target = await Products.asQueryable().where('name').equal('Lenovo Yoga 2 Pro').getItem();
            const previous = target;
            target.name = 'Lenovo Yoga 2 Pro (Second Edition)';
            const previousName = '__previous__';
            const re = new RegExp('^\\$\\bprevious\\b');
            const selectPrevious = new SelectObjectQuery(Products).select(target).as(previousName);
            const resolver = new DataModelFilterParser(Products);
            const attributes = Products.attributes;
            attributes.push({
                name: previousName,
                type: 'Product',
                model: 'Previous',
                many: false,
                'readonly': true,
                'editable': false
            })
            resolver.resolvingMember.subscribe(async (event) => {
                if (typeof event.member === 'string' && re.test(event.member)) {
                    const member = event.member.split('/');
                    member[0] = previousName;
                    event.result = {
                        $select: {
                            $name: member.join('.')
                        }
                    }
                }
            });

            const { $expand, $where } = await resolver.parseAsync(`name ne $previous/name`);
            const index = $expand.findIndex((x: any) => {
                return x.$entity && x.$entity.$as === previousName;
            });
            if (index >= 0) {
                $expand.splice(index, 1);
            }
            const q = new DataQueryable(Products);
            q.select(Products.primaryKey);
            Object.assign(q.query, {
                $where,
                $expand
            });
            q.query.join(selectPrevious).with(
                new QueryExpression().where(
                    new QueryField(Products.primaryKey).from(previousName)
                ).equal(
                    new QueryField(Products.primaryKey).from(previousName)
                )
            );
            const exists = await q.prepare().where('id').equal(target.id).count();
            expect(exists).toBeTruthy();

        });
    });

});
