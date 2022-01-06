import { TestApplication } from './TestApplication';
import { DataContext, DataFilterResolver } from '../index';
import { resolve } from 'path';

describe('DataObjectAssociationListener', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        return done();
    });
    beforeEach(async () => {
        context = app.createContext();
    });
    afterEach(async () => {
        // important: clear cache after each test
        const configuration: any = context.getConfiguration();
        if (Object.prototype.hasOwnProperty.call(configuration, 'cache')) {
            delete configuration.cache;
        }
        if (context) {
            await context.finalizeAsync();
        }
    });
    it('should use filter resolver', async ()=> {
        const q = await context.model('Person').filterAsync({
            $filter: 'id eq me()'            
        });
        const items  = await q.getItems();
        expect(items.length).toBe(0);
    });

    it('should use custom filter', async ()=> {

        Object.assign(DataFilterResolver.prototype, {
            customCustomer(callback: (err?: Error, value?: any) => void) {
                return callback(null, 'lily.stewart@example.com');
            }
        });

        const q = await context.model('Order').filterAsync({
            $filter: 'customer/user/name eq customCustomer()'            
        });
        const items  = await q.expand('customer').silent().getItems();
        expect(items.length).toBeGreaterThan(0);
        items.forEach((item) => {
            expect(item.customer.email).toBe('lily.stewart@example.com');
        });
    });
});
