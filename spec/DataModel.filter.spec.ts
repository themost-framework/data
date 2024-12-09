import { TestApplication2 } from './TestApplication';
import { DataContext, SchemaLoaderStrategy } from '../index';

describe('DataModel.filter', () => {
    let app: TestApplication2;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication2();
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });
    it('should use $filter param', async () => {
        await context.executeInTransactionAsync(async () => {
            const query = await context.model('Product').filterAsync({
                $filter: 'category eq \'Laptops\'',
                $orderby: 'name'
            });
            const items = await query.getItems();
            expect(items.length).toBeTruthy();
            for (const item of items) {
                expect(item.category).toEqual('Laptops')
            }
        });
    });

    it('should use $take param', async () => {
        await context.executeInTransactionAsync(async () => {
            const query = await context.model('Product').filterAsync({
                $filter: 'category eq \'Laptops\'',
                $orderby: 'name',
                $top: '5'
            });
            const items = await query.getItems();
            expect(items.length).toEqual(5);
        });
    });

    it('should use $skip param', async () => {
        await context.executeInTransactionAsync(async () => {
            let query = await context.model('Product').filterAsync({
                $filter: 'category eq \'Laptops\'',
                $orderby: 'name',
                $top: '10'
            });
            const items10 = await query.getItems();
            expect(items10.length).toEqual(10);

            query = await context.model('Product').filterAsync({
                $filter: 'category eq \'Laptops\'',
                $orderby: 'name',
                $top: '5',
                $skip: '5'
            });
            const items5 = await query.getItems();
            expect(items5.length).toEqual(5);
            for (let index = 0; index < items5.length; index++) {
                const element = items5[index];
                const findIndex = items10.findIndex((x) => x.id === element.id);
                expect(findIndex).toEqual(index + 5)
            }

        });
    });

    it('should use $levels param', async () => {
        await context.executeInTransactionAsync(async () => {
            let query = await context.model('Order').filterAsync({
                $filter: 'orderedItem/category eq \'Laptops\'',
                $orderby: 'orderedItem/name',
                $top: 10,
                $levels: '1'
            });
            expect((query as any).$levels).toEqual(1)
            let items10 = await query.silent().getItems();
            expect(items10.length).toEqual(10);
            for (const item of items10) {
                expect(typeof item.orderStatus).toEqual('object');    
            }

            query = await context.model('Order').filterAsync({
                $filter: 'orderedItem/category eq \'Laptops\'',
                $orderby: 'orderedItem/name',
                $top: 10,
                $levels: 0
            });
            expect((query as any).$levels).toEqual(0)
            items10 = await query.silent().getItems();
            expect(items10.length).toEqual(10);
            for (const item of items10) {
                expect(typeof item.orderStatus).toEqual('number');    
            }
        });
    });

    it('should use data view', async () => {
        await context.executeInTransactionAsync(async () => {
            const schema = context.getConfiguration().getStrategy(SchemaLoaderStrategy).getModelDefinition('Person');
            schema.views = schema.views || [];
            schema.views.push({
                name: 'PersonSummary',
                fields: [
                    {
                        name: 'id'
                    },
                    {
                        name: 'givenName'
                    },
                    {
                        name: 'familyName'
                    }
                ]
            });
            context.getConfiguration().getStrategy(SchemaLoaderStrategy).setModelDefinition(schema);
            const query = await context.model('Person').filterAsync({
                $take: 10,
                $select: 'PersonSummary'
            });
            const items = await query.silent().getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(10);
            for (const item of items) {
                expect(Object.keys(item)).toEqual([
                    'id',
                    'givenName',
                    'familyName'
                ]);
            }
        });
    });

    it('should use data view for readonly view', async () => {
        await context.executeInTransactionAsync(async () => {
            const schema = context.getConfiguration().getStrategy(SchemaLoaderStrategy).getModelDefinition('Person');
            schema.views = schema.views || [];
            schema.views.push({
                name: 'PersonRead',
                fields: [
                    {
                        name: 'id'
                    },
                    {
                        name: 'givenName',
                        property: 'firstName'
                    },
                    {
                        name: 'familyName',
                        property: 'lastName'
                    }
                ],
                privileges: [
                    {
                        mask: 1,
                        type: 'global',
                        account: '*'
                    }
                ]
            });
            context.getConfiguration().getStrategy(SchemaLoaderStrategy).setModelDefinition(schema);
            let query = await context.model('Person').filterAsync({
                $take: 10,
                $select: 'PersonRead'
            });
            let items = await query.getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(10);
            for (const item of items) {
                expect(Object.keys(item)).toEqual([
                    'id',
                    'firstName',
                    'lastName'
                ]);
            }

            query = await context.model('Person').filterAsync({
                $take: 10,
                $select: 'id,givenName,familyName'
            });
            items = await query.getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(0);
        });
    });

    it('should use data view with nested columns', async () => {
        await context.executeInTransactionAsync(async () => {
            const schema = context.getConfiguration().getStrategy(SchemaLoaderStrategy).getModelDefinition('Person');
            schema.views = schema.views || [];
            schema.views.push({
                name: 'PersonAddressRead',
                fields: [
                    {
                        name: 'id'
                    },
                    {
                        name: 'givenName',
                        property: 'firstName'
                    },
                    {
                        name: 'familyName',
                        property: 'lastName'
                    },
                    {
                        name: 'address/streetAddress',
                        property: 'streetAddress'
                    },
                    {
                        name: 'address/addressLocality',
                        property: 'addressLocality'
                    }
                ],
                privileges: [
                    {
                        mask: 1,
                        type: 'global',
                        account: '*'
                    }
                ]
            });
            context.getConfiguration().getStrategy(SchemaLoaderStrategy).setModelDefinition(schema);
            let query = await context.model('Person').filterAsync({
                $take: 10,
                $select: 'PersonAddressRead'
            });
            let items = await query.getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(10);
            for (const item of items) {
                expect(Object.keys(item)).toEqual([
                    'id',
                    'firstName',
                    'lastName',
                    'streetAddress',
                    'addressLocality'
                ]);
            }
        });
    });

    it('should use data view with nested columns and expand', async () => {
        await context.executeInTransactionAsync(async () => {
            let query = await context.model('Order').filterAsync({
                $take: 10,
                $select: 'Delivered',
                $orderby: 'customer/familyName,customer/givenName,orderedItem/name',
            });
            let items = await query.silent().getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(10);
            for (const item of items) {
                expect(Object.keys(item)).toEqual([
                    'id',
                    'orderDate',
                    'orderedItem',
                    'customerGivenName',
                    'customerFamilyName'
                ]);
            }
        });
    });


});
