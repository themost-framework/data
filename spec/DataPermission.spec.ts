import {DataModel, EdmMapping, DataContext} from '../index';
import { TestApplication } from './TestApplication';
import { resolve } from 'path';

describe('DataModel', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test1'));
        return done();
    });
    beforeEach((done) => {
        context = app.createContext();
        return done();
    });
    afterEach((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });
    it('should get items', async () => {
        // create user
        await context.model('Group').silent().save({
            "name": "Customers"
        });
        await context.model('User').silent().save({
            "name": "maria.anders@example.com",
            "groups": [
                {
                    "name": "Customers"
                }
            ]
        });
        Object.assign(context, {
            "user": {
                "name": "maria.anders@example.com"
            }
        });
        // update customer information
        await context.model('Customer').silent().save({
            id: 1,
            User: {
                name: 'maria.anders@example.com'
            }
        })
        let customer = await context.model('Customer').where('id').equal(1).getItem();
        expect(customer).toBeTruthy();
        customer = await context.model('Customer').where('id').equal(2).getItem();
        expect(customer).toBeFalsy();
    });

    it('should use parent nested privilege', async () => {
        await context.model('Group').silent().save({
            "name": "Customers"
        });
        await context.model('User').silent().save({
            "name": "Yang.Wang@example.com",
            "groups": [
                {
                    "name": "Customers"
                }
            ]
        });
        Object.assign(context, {
            "user": {
                "name": "Yang.Wang@example.com"
            }
        });
        // update customer information
        await context.model('Customer').silent().save({
            id: 14,
            User: {
                name: 'Yang.Wang@example.com'
            }
        });
        // add permission
        await context.model('Permission').silent().save({
            privilege: 'Order',
            parentPrivilege: 'customer',
            target: 14,
            account: {
                name: 'Yang.Wang@example.com'
            },
            mask: 1
        });
        // add permission
        await context.model('Permission').silent().save({
            privilege: 'OrderDetail',
            parentPrivilege: 'order/customer',
            target: 14,
            account: {
                name: 'Yang.Wang@example.com'
            },
            mask: 1
        });
        let existingItems = await context.model('Order').where('customer').equal(14).silent().getItems();
        let items = await context.model('Order').getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        items.forEach((element) => {
            expect(existingItems.find((item) => {
                return item.id === element.id;
            })).toBeTruthy();
        });
        items = await context.model('OrderDetail').asQueryable().getItems();
        existingItems = await context.model('OrderDetail').where('order/customer').equal(14).silent().getItems();
        items.forEach((element) => {
            expect(existingItems.find((item) => {
                return item.id === element.id;
            })).toBeTruthy();
        });
    });

});