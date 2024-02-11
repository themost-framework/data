import {TestUtils} from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import { DataConfigurationStrategy } from '../data-configuration';
import {SqliteAdapter} from '@themost/sqlite';

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
                        "from": "Person",
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
                        "from": "Person",
                        "foreignField": "id",
                        "localField": "customer",
                        "as": "customer"
                    }
                },
                {
                    "$lookup": {
                        "from": "PostalAddress",
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

const NewOrderSchema = {
    "name": "NewOrder",
    "version": "3.0.0",
    "fields": [
        {
            "@id": "https://themost.io/schemas/id",
            "name": "id",
            "type": "Counter",
            "primary": true
        },
        {
            "name": "acceptedOffer",
            "type": "Offer"
        },
        {
            "name": "customer",
            "type": "Person",
            "editable": false,
            "nullable": false
        },
        {
            "name": "orderDate",
            "type": "DateTime",
            "value": "javascript:return new Date();"
        },
        {
            "name": "orderedItem",
            "type": "Product",
            "expandable": true,
            "editable": true,
            "nullable": false
        },
        {
            "name": "priceCategory",
            "readonly": true,
            "type": 'Text',
            "nullable": true,
            "query": [
                {
                    "$lookup": {
                        "from": "Person",
                        "foreignField": "id",
                        "localField": "customer",
                        "as": "customer"
                    }
                },
                {
                    "$lookup": {
                        "from": "Product",
                        "foreignField": "id",
                        "localField": "orderedItem",
                        "as": "orderedItem"
                    }
                },
                {
                    "$project": {
                        "priceCategory": {
                            "$cond": [
                                {
                                    "$gt": [
                                        "$orderedItem.price",
                                        1000
                                    ]
                                },
                                'Expensive',
                                'Normal'
                            ]
                        }
                    }
                }
            ]
        },
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

const NewLocalOrderSchema = {
    "name": "NewLocalOrder",
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
                        "from": "Person",
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$eq": [ "$$customer", "$customer.id" ]
                                    }
                                }
                            }
                        ],
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

const ExtendedProductSchema = {
    "name": "ExtendedProduct",
    "version": "3.0.0",
    "inherits": "Product",
    "fields": [
        {
            "name": "priceCategory",
            "type": "Text",
            "readonly": true,
            "insertable": false,
            "editable": false,
            "nullable": true,
            "query": [
                {
                    "$project": {
                        "priceCategory": {
                            "$cond": [
                                {
                                    "$gt": [
                                        "$price",
                                        1000
                                    ]
                                },
                                'Expensive',
                                'Normal'
                            ]
                        }
                    }
                }
            ]
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
}

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

    it('should use custom query with expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition(NewOrderSchema);
            await context.model('NewOrder').migrateAsync();
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
            await context.model('NewOrder').silent().save(newOrder);
            const item = await context.model('NewOrder').where('id').equal(newOrder.id).silent().getItem();
            expect(item).toBeTruthy();
            const price = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .select('price').silent().value();
            expect(item.priceCategory).toEqual(price <= 1000 ? 'Normal' : 'Expensive');

        });
    });

    it('should use custom query with join expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition(NewLocalOrderSchema);
            await context.model('NewLocalOrder').migrateAsync();
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
            await context.model('NewLocalOrder').silent().save(newOrder);
            const item = await context.model('NewLocalOrder').where('id').equal(newOrder.id).silent().getItem();
            expect(item).toBeTruthy();
            const price = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .select('price').silent().value();
            expect(item.orderEmail).toEqual('luis.nash@example.com');

        });
    });

    it('should use custom query to project a readonly attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition(ExtendedProductSchema);
            const ExtendedProducts = context.model('ExtendedProduct');
            await ExtendedProducts.migrateAsync();
            // validate non-insertable columns
            const db: SqliteAdapter = context.db as SqliteAdapter;
            const columns = await db.table(ExtendedProducts.sourceAdapter).columnsAsync();
            expect(columns.find((item) => item.name === 'priceCategory')).toBeFalsy();
            // insert a temporary object
            const newProduct: any = {
                name: 'Samsung Galaxy S4 XL',
                price: 560,
                priceCategory: 'Normal'
            };
            await context.model('ExtendedProduct').silent().save(newProduct);
            const item = await context.model('ExtendedProduct').where('id').equal(newProduct.id).silent().getItem();
            expect(item).toBeTruthy();
            expect(item.priceCategory).toEqual('Normal');

        });
    });
    
});
