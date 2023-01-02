import { DataContext } from '../index';
import { TestUtils } from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { OpenDataQuery, OpenDataQueryFormatter, round } from '@themost/query';
import { TraceUtils } from '@themost/common';

async function execute(context: DataContext, query: OpenDataQuery) {
    const queryParams = new OpenDataQueryFormatter().formatSelect(query);
    TraceUtils.log(JSON.stringify(queryParams));
    const q = await context.model('Product').filterAsync(queryParams);
    return await q.getItems();
}

describe('OpenDataQuery.select', () => {
    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should use equal expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .where((x:any) => x.category === 'Laptops').take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toEqual(10);
            for (const result of results) {
                expect(result.category).toEqual('Laptops');
            }
        });
    });

    it('should use select', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    x.id,
                    x.name,
                    x.model
                })
                .where((x:any) => x.category === 'Laptops').take(10);
            const results = await execute(context, query);
            expect(results.length).toEqual(10);
            for (const result of results) {
                expect(result.category).toBeFalsy();
            }
        });
    });

    it('should use select with functions', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        originalPrice: x.price,
                        price: round(x.price, 2)
                    }
                })
                .where((x:any) => x.category === 'Laptops').take(10);
            const results = await execute(context, query);
            expect(results.length).toEqual(10);
            for (const result of results) {
                expect(result.originalPrice).toBeTruthy();
                expect(round(result.originalPrice, 2)).toEqual(result.price);
            }
        });
    });

    it('should use and', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .where((x:any) => {
                    return x.category === 'Laptops' && round(x.price, 2) <= 500;
                })
                .take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeLessThanOrEqual(10);
            for (const result of results) {
                expect(result.category).toEqual('Laptops');
                expect(round(result.price, 2)).toBeLessThanOrEqual(500);
            }
        });
    });

    it('should use or', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Products')
                .where((x:any) => {
                    return x.category === 'Laptops' || x.category === 'Desktops';
                })
                .orderBy((x: any) => x.price)
                .take(10);
            let results = await execute(context, query);
            expect(results.length).toBeLessThanOrEqual(10);
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect([
                    'Laptops',
                    'Desktops'
                ]).toContain(result.category);
                if (index < result.length - 1) {
                    expect(result.price).toBeLessThanOrEqual(results[index].price);
                }
            });
        });
    });

    it('should use simple or', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Products')
                .where('category').equal('Laptops').or('category').equal('Desktops')
                .orderBy('price')
                .take(10);
            let results = await execute(context, query);
            expect(results.length).toBeLessThanOrEqual(10);
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect([
                    'Laptops',
                    'Desktops'
                ]).toContain(result.category);
                if (index < result.length - 1) {
                    expect(result.price).toBeLessThanOrEqual(results[index].price);
                }
            });
        });
    });

});
