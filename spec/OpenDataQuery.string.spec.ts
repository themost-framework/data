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

describe('OpenDataQuery.string', () => {
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

    it('should use indexOf', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .where((x:{name: string}) => {
                    return x.name.indexOf('Apple') >= 0;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.name.indexOf('Apple')).toBeGreaterThanOrEqual(0);
            }
        });
    });

    it('should use toLowerCase', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        lowered: x.name.toLowerCase()
                    }
                }).where((x:any) => {
                    return x.category.toLowerCase() === 'laptops';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.name.toLowerCase()).toEqual(result.lowered);
            }
        });
    });

    it('should use toUpperCase', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name,
                        upper: x.name.toUpperCase()
                    }
                }).where((x:any) => {
                    return x.category.toUpperCase() === 'LAPTOPS';
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.name.toUpperCase()).toEqual(result.upper);
            }
        });
    });

    it('should use includes', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name
                    }
                }).where((x:any) => {
                    return x.name.includes('Apple') === true;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.name.includes('Apple')).toBeTruthy();
            }
        });
    });

    it('should use endsWith', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select((x: any) => {
                    return {
                        name: x.name
                    }
                }).where((x:any) => {
                    return x.name.endsWith('Air') === true;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.name.endsWith('Air')).toBeTruthy();
            }
        });
    });

});
