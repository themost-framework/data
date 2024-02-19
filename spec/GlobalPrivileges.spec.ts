import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';
const executeInTransaction = TestUtils.executeInTransaction;
describe('Global permissions', () => {
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
    afterEach(() => {
        delete (context as any).user;
    });

    it('should validate anonymous read access to products', async () => {
        const Products = context.model('Product');
        const items = await Products.getItems();
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toBeTruthy();
    });

    it('should validate anonymous read access to a model which does not have privileges', async () => {
        await context.executeInTransactionAsync(async () => {
            await context.model('NavigationElement').silent().save({
               name: 'Home',
               url: '/'
            });
            let items = await context.model('NavigationElement').silent().getItems();
            expect(items.length).toBeTruthy();
            const NavigationElements = context.model('NavigationElement');
            items = await NavigationElements.getItems();
            expect(items.length).toBeFalsy();
        });
    });

    it('should validate anonymous write access to products', async () => {
        const Products = context.model('Product');
        const item = await Products.where('name').equal(
            'Apple MacBook Air (13.3-inch, 2013 Version)'
        ).getItem();
        expect(item).toBeTruthy();
        expect(item.name).toBe('Apple MacBook Air (13.3-inch, 2013 Version)');
        item.model = 'APPLE-MACBOOK-AIR-13.3-2013';
        await expect(Products.save(item)).rejects.toThrow('Access Denied');
    });

    it('should validate admin write access to products', async () => {
        await executeInTransaction(context,async () => {
            const Products = context.model('Product');
            let item = await Products.where('name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItem();
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
            });
            expect(item.model).not.toBe('APPLE-MACBOOK-AIR-13.3-2013');
            expect(item).toBeTruthy();
            expect(item.name).toBe('Apple MacBook Air (13.3-inch, 2013 Version)');
            item.model = 'APPLE-MACBOOK-AIR-13.3-2013';
            await expect(Products.save(item)).resolves.toBeTruthy();
            item = await Products.where('model').equal(
                'APPLE-MACBOOK-AIR-13.3-2013'
            ).getItem();
            expect(item).toBeTruthy();
        });
    });

    it('should validate admin delete access to products', async () => {
        await executeInTransaction(context,async () => {
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
            });
            const Products = context.model('Product');
            await Products.insert({
                name: 'Apple MacBook Air (13.3-inch, 2022 Version)',
                model: 'APPLE-MACBOOK-AIR-13.3-2022',
                description: 'The MacBook Air is a line of laptop computers developed and manufactured by Apple Inc.',
                keywords: [
                    'Apple', 'MacBook', 'Air', '13.3-inch', '2022'
                ]
            });
            let item = await Products.where('name').equal(
                'Apple MacBook Air (13.3-inch, 2022 Version)'
            ).getItem();
            await expect(Products.remove(item)).resolves.toBeUndefined();
            item = await Products.where('name').equal(
                'Apple MacBook Air (13.3-inch, 2022 Version)'
            ).getItem();
            expect(item).toBeFalsy();
        });
    });

    it('should validate read access to orders', async () => {
        await executeInTransaction(context,async () => {
            const Orders = context.model('Order');
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
            let items = await Orders.where('orderedItem/name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItems();
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeFalsy();
            // add read access to contributors
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 1, // read
                    "workspace": 1
                }
            ]);
            items = await Orders.where('orderedItem/name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItems();
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeTruthy();

        });
    });

    it('should validate write access to orders', async () => {
        await executeInTransaction(context,async () => {
            const Orders = context.model('Order');
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
            // add read access to contributors
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 1, // read
                    "workspace": 1
                }
            ]);
            const items = await Orders.where('orderedItem/name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItems();
            const [order] = items;
            order.orderStatus = {
                name: 'Pickup'
            };
            await expect(Orders.save(order)).rejects.toThrow('Access Denied');

            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 4, // update
                    "workspace": 1
                }
            ]);
            await expect(Orders.save(order)).resolves.toBeTruthy();
        });
    });

    it('should validate create access to orders', async () => {
        await executeInTransaction(context,async () => {
            const Orders = context.model('Order');
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
            // add read access to contributors
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 1, // read
                    "workspace": 1
                }
            ]);
            const items = await Orders.where('orderedItem/name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItems();
            const [order] = items;
            order.orderStatus = {
                name: 'Pickup'
            };
            delete order.id;
            order.orderNumber = '123456';
            // and try to create a copy
            await expect(Orders.insert(order)).rejects.toThrow('Access Denied');
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 2, // create
                    "workspace": 1
                }
            ]);
            await expect(Orders.insert(order)).resolves.toBeTruthy();
            await expect(Orders.where('orderNumber').equal('123456').getItem()).resolves.toBeTruthy();
        });
    });

    it('should validate delete access to orders', async () => {
        await executeInTransaction(context,async () => {
            const Orders = context.model('Order');
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
            // add read access to contributors
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 1, // read
                    "workspace": 1
                }
            ]);
            const items = await Orders.where('orderedItem/name').equal(
                'Apple MacBook Air (13.3-inch, 2013 Version)'
            ).getItems();
            const [order] = items;
            order.orderStatus = {
                name: 'Pickup'
            };
            await expect(Orders.remove(order)).rejects.toThrow('Access Denied');
            await context.model('Permission').silent().save([
                {
                    "privilege": "Order", // model
                    "parentPrivilege": null,
                    "account": {
                        "name": "Contributors" // group
                    },
                    "target": 0, // all
                    "mask": 8, // delete
                    "workspace": 1
                }
            ]);
            await expect(Orders.remove(order)).resolves.toBeUndefined();
            await expect(Orders.where('id').equal(order.id).getItem()).resolves.toBeFalsy();
        });
    });
});
