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

describe('OpenDataQuery.arithmetic', () => {
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

    it('should use add', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        originalPrice: x.price,
                        price: x.price + 25
                    }
                }).where((x:any) => {
                    return x.category === 'Laptops';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.originalPrice + 25).toEqual(result.price);
            }
        });
    });

    it('should use subtract', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        originalPrice: x.price,
                        price: x.price - 25
                    }
                }).where((x:any) => {
                    return x.category === 'Laptops';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.originalPrice - 25).toEqual(result.price);
            }
        });
    });

    it('should use multiply', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        originalPrice: x.price,
                        price: x.price * 0.75
                    }
                }).where((x:any) => {
                    return x.category === 'Laptops';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.originalPrice * 0.75).toEqual(result.price);
            }
        });
    });

    it('should use divide', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        originalPrice: x.price,
                        price: x.price / 1.5
                    }
                }).where((x:any) => {
                    return x.category === 'Laptops';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.originalPrice / 1.5).toEqual(result.price);
            }
        });
    });

});
