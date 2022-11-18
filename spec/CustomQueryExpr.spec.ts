import {TestUtils} from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import { DataConfigurationStrategy } from '../data-configuration';

const TempOrderSchema = {
    "name": "TempOrder",
    "version": "3.0.0",
    "fields": [
        {
            "@id": "https://themost.io/schemas/id",
            "name": "id",
            "title": "ID",
            "description": "The identifier of the item.",
            "type": "Counter",
            "primary": true
        },
        {
            "name": "acceptedOffer",
            "title": "Accepted Offer",
            "description": "The offer e.g. product included in the order.",
            "type": "Offer"
        },
        {
            "name": "customer",
            "title": "Customer",
            "description": "Party placing the order.",
            "type": "Person",
            "editable": false,
            "nullable": false
        },
        {
            "name": "orderDate",
            "title": "Order Date",
            "description": "Date order was placed.",
            "type": "DateTime",
            "value": "javascript:return new Date();"
        },
        {
            "name": "orderEmail",
            "readonly": true,
            "type": 'Text',
            "nullable": true,
            "query": [
                {
                    "$lookup": {
                        "from": "PersonData",
                        "foreignField": "id",
                        "localField": "customer",
                        "as": "customer"
                    }
                },
                {
                    "$project": {
                        "orderEmail": "$customer.email"
                    }
                }
            ]
        },
        {
            "name": 'orderAddressLocality',
            "readonly": true,
            "type": 'Text',
            "nullable": true,
            "query": [
                {
                    "$lookup": {
                        "from": "PersonData",
                        "foreignField": "id",
                        "localField": "customer",
                        "as": "customer"
                    }
                },
                {
                    "$lookup": {
                        "from": "PostalAddressData",
                        "foreignField": "id",
                        "localField": "$customer.address",
                        "as": "address"
                    }
                },
                {
                    "$project": {
                        "orderAddressLocality": "$address.addressLocality"
                    }
                }
            ]
        },
        {
            "name": "orderedItem",
            "title": "Ordered Item",
            "description": "The item ordered.",
            "type": "Product",
            "expandable": true,
            "editable": true,
            "nullable": false
        }
    ],
    "privileges": [
        {
            "mask": 15,
            "type": "global"
        },
        {
            "mask": 15,
            "type": "global",
            "account": "Administrators"
        },
        {
            "mask": 1,
            "type": "self",
            "filter": "customer/user eq me()"
        }
    ]
};

describe('CustomQueryExpression', () => {

    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should change model definition', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition(TempOrderSchema);
            await context.model('TempOrder').migrateAsync();
            // insert a temporary object
            const newOrder: any = {
                orderDate: new Date(),
                orderedItem: {
                    name: 'Samsung Galaxy S4'
                },
                customer: {
                    email: 'luis.nash@example.com'
                }
            };
            await context.model('TempOrder').silent().save(newOrder);
            const item = await context.model('TempOrder').where('id').equal(newOrder.id).silent().getItem();
            expect(item).toBeTruthy();
            expect(item.orderEmail).toEqual('luis.nash@example.com');
            const orderAddressLocality = await context.model('Person')
                .where('email').equal('luis.nash@example.com')
                .select('address/addressLocality').silent().value();
            expect(item.orderAddressLocality).toEqual(orderAddressLocality);

        });
    });
    
});
