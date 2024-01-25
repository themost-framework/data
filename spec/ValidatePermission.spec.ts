import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';
import { TestApplication } from './TestApplication';
import { DataContext } from '../types';

describe('DataPermissionEventListener', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        app.getConfiguration().setSourceAt('adapters', [
            {
                name: 'test-local',
                invariantName: 'test',
                default: true,
                options: {
                    database: resolve(__dirname, 'test2/db/local.db')
                }
            }
        ])
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalize();
        await app.finalize();
    });
    it('should validate anonymous read', async () => {
        const items = await context.model('Product').where('category').equal('Laptops').getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
    });

    it('should validate anonymous read for embedded objects', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product');
            let item = await Products.where('name').equal('AMD Radeon R9 290').getItem();
            expect(item).toBeTruthy();
            item.productDimensions = {
                width: 100,
                height: 100
            };
            // override privileges and save item
            await context.model('Product').silent().save(item);
            // try to get item again
            item = await Products.where('name').equal('AMD Radeon R9 290').expand(
                'productDimensions'
                ).getItem();
            expect(item).toBeTruthy();
            expect(item.productDimensions).toBeTruthy();
        });
    });

    it('should validate user read access', async () => {
        await TestUtils.executeInTransaction(context, async () => {

            const user = {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile email'
            };
            Object.assign(context, {
                user
            });
            const Orders = context.model('Order');
            const itemCount = await context.model('Order')
                .where('customer/user/name').equal(user.name).silent().count();
            let items = await Orders.where('customer').getItems();
            expect(items.length).toEqual(itemCount);

            const expectedItems = await context.model('Order')
                .where('customer/user/name').equal(user.name).select(
                    'orderedItem/category as category',
                    'count(orderedItem/name) as total'
                ).groupBy(
                    'orderedItem/category',
                ).silent().getItems();
            
            items = await Orders
                .where('customer/user/name').equal(user.name).select(
                    'orderedItem/category as category',
                    'count(orderedItem/name) as total'
                ).groupBy(
                    'orderedItem/category',
                ).getItems();
            for (const item of items) {
                const expectedItem = expectedItems.find((expectedItem) => {
                    return expectedItem.category === item.category;
                });
                expect(expectedItem).toBeTruthy();
                expect(item.total).toEqual(expectedItem.total);
            }

        });
    });

    // this test is trying to read an object where the user has no access
    // but the associated object is embebbed and it is allowed to read
    // e.g. user has no access to read a postal address but it is allowed to read
    // a person's address
    it('should read an embedded object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const user = {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile email'
            };
            Object.assign(context, {
                user
            });
            const People = context.model('Person');
            const itemCount = await context.model('Person')
                .where('user/name').equal(user.name).silent().count();
            expect(itemCount).toEqual(1);
            let item = await People.where('user/name').equal(user.name).getItem();
            expect(item).toBeTruthy();
            expect(item.address).toBeTruthy();
            const PostalAddresses = context.model('PostalAddress');
            const address = await PostalAddresses.where('id').equal(item.address.id).getItem();
            expect(address).toBeFalsy();
            item = await People.select(
                'id',
                'givenName',
                'familyName',
                'address/streetAddress as streetAddress',
                'address/addressLocality as addressLocality',
            ).where('user/name').equal(user.name).getItem();
            expect(item).toBeTruthy();
        });
    });

    it('should read attributes of an embedded object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const user = {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile email'
            };
            Object.assign(context, {
                user
            });
            const People = context.model('Person');
            const item = await People.select(
                'id',
                'givenName',
                'familyName',
                'address/streetAddress as streetAddress',
                'address/addressLocality as addressLocality',
            ).where('user/name').equal(user.name).getItem();
            expect(item).toBeTruthy();
        });
    });


});