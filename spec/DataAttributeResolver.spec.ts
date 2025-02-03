import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';

describe('DataAttributeResolver', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    })
    it('should resolve child nested attributes', async () => {
        Object.assign(context, {
            user: {
                name: 'anonymous'
            }
        });
        let items = await context.model('Product').select(
            'id',
            'orders/id as orderID',
            'orders/customer as customer'
        ).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.orderID).toBe(null);
            expect(item.customer).toBe(null);
        }
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        const customer = await context.model('Person').where('user/name').equal('luis.nash@example.com').getItem();
        expect(customer).toBeTruthy();
        items = await context.model('Product').select(
            'id',
            'orders'
        ).getItems();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should resolve parent nested attributes', async () => {
        Object.assign(context, {
            user: null
        });
        const items = await context.model('Order').select(
            'id',
            'orderedItem/name as productName',
            'customer/name as customerName'
        ).getList();
        expect(items).toBeTruthy();
        expect(Array.isArray(items.value)).toBeTruthy();
        expect(items.value.length).toBe(0);
    });

    it('should get privileged view', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            await context.model('User').silent().save([
                {
                  "enabled": 1,
                  "name": "michael.barret@example.com",
                  "description": "Michael Barret",
                  "groups": [
                      {
                          "name": "Contributors"
                      }
                  ]
                }
              ]);
            Object.assign(context, {
                user: {
                    name: 'michael.barret@example.com'
                }
            });
            let items = await context.model('Order').select('Delivered').getList();
            expect(items).toBeTruthy();
            expect(Array.isArray(items.value)).toBeTruthy();
            expect(items.value.length).toBeGreaterThan(0);
            const newUser =  {
                "enabled": 1,
                "name": "tom.hutchinson@example.com",
                "description": "Tom Hutchinson",
                "groups": [
                    {
                        "name": "Users"
                    }
                ]
              };
            await context.model('User').silent().save(newUser);
            Object.assign(context, {
                user: {
                    name: 'tom.hutchinson@example.com'
                }
            });
            items = await context.model('Order').select('Delivered').getList();
            expect(items.value.length).toBe(0);
            await context.model('Permission').silent().save({
                parentPrivilege: 'Order',
                privilege: 'Delivered',
                mask: 1,
                account: {
                    name: 'tom.hutchinson@example.com'
                },
                target: 0
            });
            items = await context.model('Order').select('Delivered').getList();
            expect(items.value.length).toBeGreaterThan(0);
        });
    });


    it('should get nested item', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const product = await context.model('Product').asQueryable().silent().getItem();
            product.productImage = {
                url: '/images/products/abc.png'
            }
            await context.model('Product').silent().save(product);
            Object.assign(context, {
                user: null
            });
            let item = await context.model('Product').where('id').equal(product.id).getItem();
            expect(item.productImage).toBeTruthy();
        });
    });
    
});
