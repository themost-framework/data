import { QueryEntity, QueryExpression, QueryField, SqlFormatter } from '@themost/query';
import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('DataAttributeResolver', () => {
    let app;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
    });
    it('should resolve child nested attributes', async () => {
        Object.assign(context, {
            user: {
                name: 'anonymous'
            }
        });
        let items = await context.model('Product').select(
            'id',
            'orders/id as orderID',
            'orders/customer as customer'
        ).getItems();
        expect(items.length).toBe(0);
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        const customer = await context.model('Person').where('user/name').equal('luis.nash@example.com').getItem();
        expect(customer).toBeTruthy();
        items = await context.model('Product').select(
            'id',
            'orders'
        ).getItems();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should resolve child nested attributes', async () => {
        Object.assign(context, {
            user: null
        });
        const items = await context.model('Product').select(
            'id',
            'orders/id as orderID',
            'orders/customer as customer'
        ).getItems();
        expect(items.length).toBe(0);
    });

    it('should resolve parent nested attributes', async () => {
        Object.assign(context, {
            user: null
        });
        const items = await context.model('Order').select(
            'id',
            'orderedItem/name as productName',
            'customer/name as customerName'
        ).getItems();
        expect(items.length).toBe(0);
    });
    
});