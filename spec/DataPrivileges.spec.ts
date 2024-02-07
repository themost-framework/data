import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('Permissions', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should validate read access', async () => {
        const Products = context.model('Product');
        const items = await Products.getItems();
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toBeTruthy();
    });

    it('should validate write access', async () => {
        const Products = context.model('Product');
        const item = await Products.where('name').equal(
            'Apple MacBook Air (13.3-inch, 2013 Version)'
        ).getItem();
        expect(item).toBeTruthy();
        expect(item.name).toBe('Apple MacBook Air (13.3-inch, 2013 Version)');
        item.model = 'APPLE-MACBOOK-AIR-13.3-2013';
        await expect(Products.save(item)).rejects.toThrow('Access Denied');
    });

    it('should validate create access', async () => {
        const Products = context.model('Product');
        // set context user
        Object.assign(context, {
            user: {
                name: 'christina.ali@example.com'
        }});
        const orderedItem = await Products.where('name').equal(
            'Apple MacBook Air (13.3-inch, 2013 Version)'
        ).getItem();
        expect(orderedItem).toBeTruthy();
        const customer = await context.model('People').where('user/name')
            .equal('christina.ali@example.com')
            .getItem();
        expect(customer).toBeTruthy();
        const Orders = context.model('Order');
        let newOrder = {
            orderedItem,
            customer
        };
        await expect(Orders.save(newOrder)).resolves.toBeTruthy();
        // try to place an order with different status (should fail)
        const orderStatus = {
            name: 'Pickup'
        }
        await expect(Orders.save({
            orderedItem,
            customer,
            orderStatus
        })).rejects.toThrow('Access Denied');
    });

    it('should validate update access', async () => {
        await context.model('ActionStatusType').getItems()
        const Products = context.model('Product');
        const user = {
            name: 'margaret.davis@example.com'
        }
        // add user to contributors
        const group = await context.model('Group').where('name').equal('Contributors').getTypedItem();
        expect(group).toBeTruthy();
        const members = group.property('members').silent();
        await members.insert(user);
        Object.assign(context, {
            user
        });
        const user1 = await context.model('User').find(user)
            .expand('groups').silent().getItem();
        expect(user1).toBeTruthy();
        expect(user1.groups).toBeTruthy();
        const orderedItem = await Products.where('name').equal(
            'Lenovo Yoga 2 Pro'
        ).getItem();
        expect(orderedItem).toBeTruthy();
        const customer = await context.model('People').where('user/name')
            .equal('christina.ali@example.com')
            .getItem();
        expect(customer).toBeTruthy();
        const agent = await context.model('People').where('user/name')
            .equal(user.name)
            .getItem();
        expect(agent).toBeTruthy();
        const OrderActions = context.model('OrderAction');
        let newAction = {
            orderedItem,
            customer,
            agent
        };
        await expect(OrderActions.save(newAction)).resolves.toBeTruthy();

    });

});
