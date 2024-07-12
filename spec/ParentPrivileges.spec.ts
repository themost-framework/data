import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';
const executeInTransaction = TestUtils.executeInTransaction;

interface DataContextWithUser extends DataContext {
    user: any
}

describe('Parent permissions', () => {
    let app: TestApplication;
    let context: DataContextWithUser;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext() as DataContextWithUser;
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });
    afterEach(() => {
        delete context.user;
    });

    it('should allow to read objects based on parent', async () => {
        await executeInTransaction(context, async () => {
            // create merchant
            const merchant : { id?: number, name: string, email: string, telephone: string} = {
                name: 'Weber and Sons',
                email: 'weber-and-sons@example.com',
                telephone: '+441234567890'
            };
            await context.model('Party').silent().save(merchant);
            // create order
            const order = {
                merchant,
                orderedItem: {
                    name: 'Samsung Galaxy S4'
                },
                orderStatus: {
                    name: 'Processing'
                },
                customer: {
                    email: 'collin.jenkins@example.com'
                }
            };
            await context.model('Order').silent().save(order);
            // create user
            const user = {
                name: 'tommy.jenkins@example.com',
            }
            await context.model('User').silent().save(user);
            // create Merchants
            await context.model('Group').silent().save({
                name: 'Merchants',
                members: [{
                    name: 'tommy.jenkins@example.com'
                }]
            });
            // create group for the merchant
            const group = {
                name: 'Weber and Sons Merchants',
                alternateName: 'WeberAndSonsMerchants',
                members: [{
                    name: 'tommy.jenkins@example.com'
                }]
            };

            await context.model('Group').silent().save(group);
            // set permission based on parent
            // which is a merchant
            // the users who are in the group 'Weber and Sons Merchants' can read the orders
            // made by the merchant 'Weber and Sons'
            await context.model('Permission').silent().save({
                privilege: 'Order',
                parentPrivilege: 'merchant',
                account: {
                    name: 'Weber and Sons Merchants'
                },
                mask: 1,
                target: merchant.id // set target id which the identifier of the merchant
            });
            context.user = user;
            const items = await context.model('Order').getItems();
            expect(items.length).toBe(1);
        });
    });

});
