import {resolve} from 'path';
import {DataContext} from '../index';
import {TestApplication} from './TestApplication';

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

});
