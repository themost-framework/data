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

describe('OpenDataQuery.date', () => {
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

    it('should format year', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .where((x:{releaseDate: Date}) => {
                    return x.releaseDate.getFullYear() === 2019;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.releaseDate.getFullYear()).toEqual(2019);
            }
        });
    });

    it('should format month', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select<any>(x => {
                    x.id,
                    x.model,
                    x.name,
                    x.releaseDate,
                    x.category
                })
                .where((x:{releaseDate: Date}) => {
                    return x.releaseDate.getFullYear() === 2019 && 
                        x.releaseDate.getMonth() === 1;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.releaseDate.getFullYear()).toEqual(2019);
                expect(result.releaseDate.getMonth()).toEqual(1);
            }
        });
    });

    it('should format day', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select<any>(x => {
                    x.id,
                    x.model,
                    x.name,
                    x.releaseDate,
                    x.category
                })
                .where((x:{releaseDate: Date}) => {
                    return x.releaseDate.getFullYear() === 2019 && 
                        x.releaseDate.getMonth() === 1 &&
                        x.releaseDate.getDate() === 3;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.releaseDate.getFullYear()).toEqual(2019);
                expect(result.releaseDate.getMonth()).toEqual(1);
                expect(result.releaseDate.getDate()).toEqual(3);
            }
        });
    });

    it('should format date parts', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const query = new OpenDataQuery().from('Products')
                .select<any>(x => {
                    return {
                        id: x.id,
                        model: x.model,
                        name: x.name,
                        releaseDate: x.releaseDate,
                        releaseYear: x.releaseDate.getFullYear(),
                        releaseMonth: x.releaseDate.getMonth(),
                        releaseDay: x.releaseDate.getDate()
                    }
                })
                .where((x:{releaseDate: Date}) => {
                    return x.releaseDate.getFullYear() === 2019;
                }).take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Product').filterAsync(queryParams);
            const results = await q.getItems();
            expect(results.length).toBeTruthy();
            for (const result of results) {
                expect(result.releaseDate.getFullYear()).toEqual(result.releaseYear);
                expect(result.releaseDate.getMonth()).toEqual(result.releaseMonth);
                expect(result.releaseDate.getDate()).toEqual(result.releaseDay);
            }
        });
    });


});
