import {resolve} from 'path';
import {DataContext} from '../index';
import {TestApplication} from './TestApplication';
import {count} from "@themost/query";

describe('DataQueryable', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        app.getConfiguration().getSourceAt('adapters').unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    });

    it('should use select closure', async () => {
        const items = await context.model('Product').asQueryable().select((product: any) => {
            return {
                id: product.id,
                name: product.name
            }
        }).getItems();
        expect(items).toBeInstanceOf(Array);
        for (const item of items) {
            const keys = Object.keys(item);
            expect(keys).toEqual([
                'id',
                'name'
            ])
        }
    });

    it('should use select closure with nested arguments', async () => {
        const items = await context.model('Order').asQueryable().select((x: any) => {
            return {
                id: x.id,
                product: x.orderedItem.name,
                customerFamilyName: x.customer.familyName,
                customerGivenName: x.customer.givenName,
                orderDate: x.orderDate
            }
        }).silent().getItems();
        expect(items).toBeInstanceOf(Array);
    });

    it('should use select closure with aggregate data', async () => {
        const items = await context.model('Order').asQueryable().select((x: any) => {
            return {
                product: x.orderedItem.name,
                total: count(x.id),
            }
        }).groupBy((x: any) => {
            x.orderedItem.name
        }).silent().getItems();
        expect(items).toBeInstanceOf(Array);
        for (const item of items) {
            expect(item.total).toBeTruthy();
            expect(item.total).toBeGreaterThan(0);
        }
    });

    it('should use lower than', async () => {
        let results = await context.model('Product').select((x: any) => {
            x.id,
            x.name,
            x.price
        }).where((x: any) => {
            return x.price < 400;
        }).silent().getItems();
        expect(results.length).toBeTruthy();
        results.forEach(x => {
            expect(x.price).toBeLessThan(400);
        });
    });

    it('should use greater than', async () => {
        let results = await context.model('Product').select((x: any) => {
            x.id,
            x.name,
            x.price
        }).where((x: any) => {
            return x.price > 400;
        }).silent().getItems();
        expect(results.length).toBeTruthy();
        results.forEach(x => {
            expect(x.price).toBeGreaterThan(400);
        });
    });

    it('should use greater than or equal', async () => {
        let results = await context.model('Product').select((x: any) => {
            x.id,
            x.name,
            x.price
        }).where((x: any) => {
            return x.price >= 545.16;
        }).silent().getItems();
        expect(results.length).toBeTruthy();
        results.forEach(x => {
            expect(x.price).toBeGreaterThanOrEqual(545.16);
        });
    });

    it('should use lower than or equal', async () => {
        let results = await context.model('Product').select((x: any) => {
            x.id,
            x.name,
            x.price
        }).where((x: any) => {
            return x.price <= 545.16;
        }).silent().getItems();
        expect(results.length).toBeTruthy();
        results.forEach(x => {
            expect(x.price).toBeLessThanOrEqual(545.16);
        });
    });

});
