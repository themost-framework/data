import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication, TestApplication2 } from './TestApplication';

describe('DataAssociationMapping', () => {
    let app: TestApplication2;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    })
    it('should get item children (for one-to-many association)', async () => {
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
            expect(item.orderedItem).toBeTruthy();
            expect(item.orderedItem.id).toBeDefined();
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
            expect(Array.isArray(item.members)).toBeTruthy();
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
            expect(Array.isArray(item.groups)).toBeTruthy();
        }
        const item = items.find( x => x.name === 'alexis.rees@example.com');
        expect(item).toBeTruthy();
        expect(item.groups.length).toBeGreaterThan(1);
    });

    it('should select expandable attribute', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        let items = await context.model('User').asQueryable()
            .select(
                'id',
                'name',
                'groups'
            ).take(25).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(Array.isArray(item.groups)).toBeTruthy();
        }
    });

    it('should use $select with expandable attribute', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        const users = context.model('User');
        const query = await users.filterAsync({
            '$select': 'id,groups,name',
            '$top': 25,
            '$expand': 'groups'
        })
        let items = await query.getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(Array.isArray(item.groups)).toBeTruthy();
        }
    });

    
});
