import { DataContext } from '../index';
import { TestUtils } from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { OpenDataQuery, OpenDataQueryFormatter, round, count, any } from '@themost/query';
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

    it('should use nested attributes', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Orders')
                .where((x:any) => {
                    return x.orderedItem.category === 'Laptops' &&
                        x.orderStatus.alternateName === 'OrderDelivered' 
                })
                .orderBy((x:any) => x.orderDate)
                .expand((x:any) => x.orderedItem, (x:any) => x.orderStatus)
                .take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Orders').filterAsync(queryParams);
            let results = await q.silent().getItems();
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect(result.orderedItem.category).toEqual('Laptops');
                expect(result.orderStatus.alternateName).toEqual('OrderDelivered');
            });
        });
    });

    it('should use nested attributes with functions', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Orders')
                .where((x:any) => {
                    return x.orderedItem.name.indexOf('Apple') >= 0;
                })
                .orderBy((x:any) => x.orderDate)
                .expand((x:any) => x.orderedItem, (x:any) => x.orderStatus)
                .take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Orders').filterAsync(queryParams);
            let results = await q.silent().getItems();
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect(result.orderedItem.name.indexOf('Apple')).toBeGreaterThanOrEqual(0);
            });
        });
    });

    it('should use deep nested attributes with functions', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Orders')
                .where((x:any) => {
                    return x.customer.address.addressLocality.includes('Manchester') === true;
                })
                .orderBy((x:any) => x.orderDate)
                .expand((x:any) => x.customer.address)
                .take(10);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Orders').filterAsync(queryParams);
            let results = await q.silent().getItems();
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect(result.customer.address.addressLocality.includes('Manchester')).toBeTruthy();
            });
        });
    });

    it('should use group by', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Orders')
                .select((x:any) => {
                    return {
                        name:x.orderedItem.name,
                        total:count(x.id)
                    }
                })
                .where((x:any) => {
                    return x.orderedItem.category === 'Laptops';
                })
                .groupBy((x:any) => {
                    x.orderedItem.name
                })
                .orderBy((x:any) => {
                    return {
                        total:count(x.id)
                    };
                });
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Orders').filterAsync(queryParams);
            let results = await q.silent().getItems();
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect(result.total).toBeTruthy();
            });
        });
    });

    it('should use expand with expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let query = new OpenDataQuery().from('Orders')
                .expand(any((x:any) => x.orderedItem).select((y:any) => {
                    return {
                        id: y.id,
                        name: y.name
                    }
                })).where((x:any) => {
                    return x.orderedItem.category === 'Laptops';
                }).orderBy((x:any) => x.orderDate)
                .take(20);
            const queryParams = new OpenDataQueryFormatter().formatSelect(query);
            const q = await context.model('Orders').filterAsync(queryParams);
            let results = await q.silent().getItems();
            expect(results.length).toBeGreaterThan(0);
            results.forEach((result, index) => {
                expect(result.orderedItem).toBeTruthy();
                expect(result.orderedItem.category).toBeFalsy();
            });
        });
    });

});
