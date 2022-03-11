import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('DataAssociationMapping', () => {
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
    it('should get item children', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        let items = await context.model('Person').where('user/name')
            .equal('luis.nash@example.com')
            .expand('orders').getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const customer = item.id;
            expect(item.orders).toBeInstanceOf(Array);
            for (const order of item.orders) {
                expect(order.customer).toBe(customer);
            }
        }
    });

    it('should get item children (with select)', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        let items = await context.model('Person').where('user/name')
            .equal('luis.nash@example.com')
            .expand({
                name: 'orders',
                options: {
                    $select: 'orderDate,orderedItem'
                }
            }).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const customer = item.id;
            expect(item.orders).toBeInstanceOf(Array);
            expect(item.orders.length).toBeGreaterThan(0);
            for (const order of item.orders) {
                expect(order.customer).toBe(customer);
            }
        }
    });

    it('should get item children (with group by)', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        let items = await context.model('Person').where('user/name')
            .equal('luis.nash@example.com')
            .expand({
                name: 'orders',
                options: {
                    $select: 'year(orderDate) as year,count(id) as total',
                    $group: 'year(orderDate)'
                }
            }).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const customer = item.id;
            expect(item.orders).toBeInstanceOf(Array);
            expect(item.orders.length).toBeGreaterThan(0);
            for (const order of item.orders) {
                expect(order.customer).toBe(customer);
            }
        }
    });

    it('should get item children', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        let items = await context.model('Person').asQueryable()
            .expand('orders').skip(5).take(5).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const customer = item.id;
            expect(item.orders).toBeInstanceOf(Array);
            for (const order of item.orders) {
                expect(order.customer).toBe(customer);
            }
        }
    });

    it('should get item parent', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        let items = await context.model('Order').asQueryable()
            .expand('orderedItem').skip(5).take(5).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.orderedItem).toBeInstanceOf(Object);
            expect(item.orderedItem.id).toBeInstanceOf(Number);
        }
        
    });

    it('should get item children (for many-to-many association)', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        let items = await context.model('Group').asQueryable()
            .expand({
                name: 'members',
                options: {
                    $select: 'name'
                }
            }).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.members).toBeInstanceOf(Array);
        }
        const item = items.find( x => x.name === 'Guests');
        expect(item).toBeTruthy();
        expect(item.members.length).toBe(1);
        expect(item.members[0].name).toBe('anonymous');
    });

    it('should get item parent (for many-to-many association)', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        let items = await context.model('User').asQueryable()
            .expand({
                name: 'groups',
                options: {
                    $select: 'name'
                }
            }).take(25).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.groups).toBeInstanceOf(Array);
        }
        const item = items.find( x => x.name === 'alexis.rees@example.com');
        expect(item).toBeTruthy();
        expect(item.groups.length).toBeGreaterThan(1);
    });

    
});