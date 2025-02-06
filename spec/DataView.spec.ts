import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';
import cloneDeep from 'lodash/cloneDeep';
const executeInTransaction = TestUtils.executeInTransaction;

interface DataContextWithUser extends DataContext {
    user: any
}

const contributor = {
    "enabled": 1,
    "name": "michael.barret@example.com",
    "description": "Michael Barret",
    "groups": [
        {
            "name": "Contributors"
        }
    ]
  };

function getNewContributor() {
    return {
        "enabled": 1,
        "name": "michael.barret@example.com",
        "description": "Michael Barret",
        "groups": [
            {
                "name": "Contributors"
            }
        ]
      }
}

function getNewAgent() {
    return {
        "enabled": 1,
        "name": "jenna.borrows@example.com",
        "description": "Jenna Borrows",
        "groups": [
            {
                "name": "Agents"
            }
        ]
      }
}

describe('DataView', () => {
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

    it('should validate view pre-defined privileges', async () => {
        await executeInTransaction(context, async () => {
            const newUser = getNewContributor();
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: newUser.name
                }
            });
            const Orders = context.model('Order');
            const q = await Orders.filterAsync({
                $select: 'Delivered',
                $orderby: 'orderDate desc',
            });
            const items = await q.getList();
            expect(items).toBeTruthy();
            expect(Array.isArray(items.value)).toBeTruthy();
            expect(items.value.length).toBeGreaterThan(0);
            for (const item of items.value) {
                expect(item.orderStatus.id).toEqual(1);
            }
        });
    });

    it('should try to use an attribute which is not included in view', async () => {
        await executeInTransaction(context, async () => {
            const newUser = getNewContributor();
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: newUser.name
                }
            });
            const Orders = context.model('Order');
            await expect(Orders.filterAsync({
                $select: 'Delivered',
                $filter: 'customer/jobTitle eq \'Civil Engineer\''
            })).rejects.toThrow('The specified attribute is not valid at the context of a pre-defined object view.');
        });
    });

    it('should try to use an attribute having alias', async () => {
        await executeInTransaction(context, async () => {
            const newUser = getNewContributor();
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: newUser.name
                }
            });
            const Orders = context.model('Order');
            const q = await Orders.filterAsync({
                $select: 'Delivered',
                $filter: 'customerFamilyName eq \'Chapman\''
            });
            const items = await q.getList();
            expect(items.value.length).toBeGreaterThan(0);
        });
    });

    it('should try to expand a view attribute using a specific child view', async () => {
        await executeInTransaction(context, async () => {
            await context.model('Group').silent().save({
                "name": "Agents",
                "alternateName": "agents",
                "description": "Site Agents"
            });
            const newUser = getNewAgent();
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: newUser.name
                }
            });
            const Orders = context.model('Order');
            let q = await Orders.filterAsync({
                $select: 'Processing',
                $expand: 'customer($select=summary)'
            });
            let items = await q.getList();
            expect(items.value.length).toBeGreaterThan(0);
            for (const item of items.value) {
                expect(item.customer).toBeTruthy();
                expect(item.customer.familyName).toBeTruthy();
            }
            q = await Orders.filterAsync({
                $select: 'Processing',
                $expand: 'customer'
            });
            items = await q.getList();
            expect(items.value.length).toBeGreaterThan(0);
            for (const item of items.value) {
                expect(item.customer).toBeFalsy();
            }
        });
    });

    it('should try to expand a view attribute using a an attribute which is not included in child view', async () => {
        await executeInTransaction(context, async () => {
            await context.model('Group').silent().save({
                "name": "Agents",
                "alternateName": "agents",
                "description": "Site Agents"
            });
            const newUser = getNewAgent();
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: newUser.name
                }
            });
            const Orders = context.model('Order');
            let q = await Orders.filterAsync({
                $select: 'Processing',
                $expand: 'customer($select=familyName,jobTitle)'
            });
            let items = await q.getList();
            expect(items.value.length).toBeGreaterThan(0);
            for (const item of items.value) {
                expect(item.customer).toBeFalsy();
            }
        });
    });

});