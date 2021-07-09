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
        })
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

});