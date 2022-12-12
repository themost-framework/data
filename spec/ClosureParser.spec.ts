import {TestUtils} from './adapter/TestUtils';
import { TestAdapter } from './adapter/TestAdapter';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import { DataConfigurationStrategy } from '../data-configuration';
import { round, count } from '@themost/query';

describe('ClosureParser', () => {

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

    it('should use select closure', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const items = await context.model('Product').select((x: any) => {
                return {
                    id: x.id,
                    name: x.name,
                    category: x.category,
                    newPrice: round(x.price, 2)
                }
            }).silent().take(10).getItems();
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeTruthy();
        });
    });

    it('should use select closure with nested attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const items = await context.model('Order').select((x: any) => {
                return {
                    id: x.id,
                    orderDate: x.orderDate,
                    productName: x.orderedItem.name,
                    productPrice: x.orderedItem.price
                }
            }).silent().take(10).getItems();
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeTruthy();
        });
    });

    it('should use where closure', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product');
        const results = await Products.select((x: any) => {
                x.id,
                x.name,
                x.category,
                x.model,
                x.price
            }).where((x: any) => {
                return x.price > 400;
            }).take(10).silent().getItems();
            results.forEach((item) => {
                expect(item.price).toBeGreaterThan(400);
            });
        });
    });

    it('should use order by closure', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product');
            const results = await Products.select((x: any) => {
                x.id,
                x.name,
                x.category,
                x.model,
                x.price
            }).where((x: any) => {
                return x.price > 400;
            }).orderBy(
                (x: any) => x.price
            ).take(10).silent().getItems();
            results.forEach( (x, index) => {
                if (index > 0) {
                    expect(x.price).toBeGreaterThanOrEqual(results[index-1].price);
                }
            });
        });
    });

    it('should use group by closure', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const category = 'Laptops';
            const items = await context.model('Order')
            .select((x: any) => {
                return {
                    total: count(x.id),
                    product: x.orderedItem.name,
                    model:  x.orderedItem.model
                }
            })
            .groupBy<any>(x => x.orderedItem.name, (x: { orderedItem: { model: any; }; }) => x.orderedItem.model).where((x: any) => {
                return  x.orderedItem.category === category;
            }, {
                category
            }).silent().take(10).getItems();
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeTruthy();
        });
    });

});