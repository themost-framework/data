import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('DataValueResolver', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    })
    it('should resolve value from an associated parent object', async () => {
        const product = await context.model('Product').where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        let items = await Orders.where('orderedItem').equal(product).getItems();
        expect(items.length).toBeTruthy();
        for (const order of items) {
            expect(order.orderedItem.id).toEqual(product.id);
        }
    });

    it('should fail resolving value from an associated parent object', async () => {
        const product = await context.model('Product').where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        // remove product id
        delete product.id;
        const Orders = context.model('Order').silent();
        expect(() => Orders.where('orderedItem').equal(product)).toThrowError('Invalid value for property "orderedItem"');
    });

    it('should resolve value from a property of an associated parent object', async () => {
        const product = await context.model('Product').where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        let items = await Orders.where('orderedItem/name').equal(product).getItems();
        expect(items.length).toBeTruthy();
        for (const order of items) {
            expect(order.orderedItem.id).toEqual(product.id);
        }
    });

    it('should resolve value from an associated child object', async () => {
        const Products = context.model('Product').silent();
        const product = await Products.where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        const lastOrder = await Orders.where('orderedItem').equal(product)
            .orderByDescending('dateCreated').expand('customer').getItem();
        expect(lastOrder).toBeTruthy();
        const { customer } = lastOrder;
        const items = await Products.where('orders/customer').equal(customer).getItems();
        expect(items.length).toBeTruthy();
        const found = items.find((x) => x.id === product.id);
        expect(found).toBeTruthy();
    });

    it('should resolve value from an associated child nested object', async () => {
        const Products = context.model('Product').silent();
        const product = await Products.where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        const lastOrder = await Orders.where('orderedItem').equal(product)
            .orderByDescending('dateCreated').expand({
                name: 'customer',
                options: { $expand: 'address' }
            }).getItem();
        expect(lastOrder).toBeTruthy();
        const { customer } = lastOrder;
        const items = await Products.where('orders/customer/address').equal(customer.address).getItems();
        expect(items.length).toBeTruthy();
        const found = items.find((x) => x.id === product.id);
        expect(found).toBeTruthy();
    });

    it('should resolve value from a property of an associated child object', async () => {
        const Products = context.model('Product').silent();
        const product = await Products.where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        const lastOrder = await Orders.where('orderedItem').equal(product.id)
            .orderByDescending('dateCreated').expand('customer').getItem();
        expect(lastOrder).toBeTruthy();
        const { customer } = lastOrder;
        const items = await Products.where('orders/customer/id').equal(customer).getItems();
        expect(items.length).toBeTruthy();
        const found = items.find((x) => x.id === product.id);
        expect(found).toBeTruthy();
    });

    it('should fail resolving value from an associated child object', async () => {
        const Products = context.model('Product').silent();
        const product = await Products.where('name').equal('Western Digital My Passport Slim (1TB)').getItem();
        expect(product).toBeTruthy();
        const Orders = context.model('Order').silent();
        const lastOrder = await Orders.where('orderedItem').equal(product)
            .orderByDescending('dateCreated').expand('customer').getItem();
        expect(lastOrder).toBeTruthy();
        const { customer } = lastOrder;
        delete customer.id;
        expect(() => Products.where('orders/customer').equal(customer)).toThrowError('Invalid value for property "customer"');
    });

    it('should resolve value from an object based on a many-to-many association', async () => {
        const Users = context.model('User').silent();
        const Groups = context.model('Group').silent();
        const group = await Groups.where('name').equal('Administrators').getItem();
        expect(group).toBeTruthy();
        let items = await Users.where('groups').equal(group).getItems();
        expect(items.length).toBeTruthy();
    });

    it('should resolve value from an object based on a parent/child many-to-many association', async () => {
        const Users = context.model('User').silent();
        const Groups = context.model('Group').silent();
        const user = await Users.where('name').equal('alexis.rees@example.com').getItem();
        expect(user).toBeTruthy();
        let items = await Groups.where('members').equal(user).getItems();
        expect(items.length).toBeTruthy();
    });

    
});
