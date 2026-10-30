// noinspection JSUnusedLocalSymbols

import {resolve} from 'path';
import {DataAssociationMapping, DataContext, DataObjectTag} from '../index';
import {TestApplication} from './TestApplication';
import {DataFilterResolver} from '@themost/data';
import {MemberExpression, QueryEntity, QueryExpression, QueryField} from '@themost/query';

declare class DataFilterResolverWithExtensions extends DataFilterResolver {
    regions(): Promise<string[]>;
}

describe('Permissions', () => {
    let app: TestApplication;
    let context: DataContext;

    function regions(callback: (err?: Error, res?: any) => void) {
        return this.context.model('User').asQueryable()
            .select('id', 'name')
            .where('name').equal(this.context.user.name)
            .expand('userRegions').silent().getItem().then((user: any) => {
                const values = (user && user.userRegions || []);
                return callback(null, values);
            }).catch((err: Error) => {
                return callback(err);
            });
    }

    function userRegions(callback: (err?: Error, res?: any) => void) {
        const Users = this.context.model('User');
        const { viewAdapter: UserView } = Users;
        const property: DataObjectTag = Users.convert({}).property('userRegions');
        const { viewAdapter: UserRegionView } = property.getBaseModel();
        const mapping: DataAssociationMapping = property.mapping;
        void property.migrate((err: Error) => {
            if (err) {
                return callback(err);
            }
            const query = new QueryExpression().select(
                new QueryField(mapping.associationValueField).from('userRegions')
            ).from('Any')
                .join(new QueryEntity(UserView).as('userRegions_Users'))
                .with(
                    new QueryExpression().where(
                        new QueryField('name').from('userRegions_Users')
                    ).equal(
                        this.context.user.name
                    )
                )
                .join(new QueryEntity(UserRegionView).as('userRegions')).with(
                    new QueryExpression().where(
                        new QueryField(mapping.associationObjectField).from('userRegions')
                    ).equal(
                        new QueryField('id').from('userRegions_Users')
                    )
                );
            const { $expand } = query;
            return callback(null, Object.assign(new MemberExpression(`userRegions.${mapping.associationValueField}`), {
                $expand
            }));
        });
    }

    if (Object.prototype.hasOwnProperty.call(DataFilterResolver.prototype, 'regions') === false) {
        Object.assign(DataFilterResolver.prototype, {
            regions,
            userRegions
        })
    }

    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should validate read access', async () => {
        const Products = context.model('Product');
        const items = await Products.getItems();
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toBeTruthy();
    });

    it('should have no read access', async () => {
        const Orders = context.model('Order');
        const items = await Orders.getItems();
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toBeFalsy();
    });

    it('should validate write access', async () => {
        const Products = context.model('Product');
        const item = await Products.where('name').equal(
            'Apple MacBook Air (13.3-inch, 2013 Version)'
        ).getItem();
        expect(item).toBeTruthy();
        expect(item.name).toBe('Apple MacBook Air (13.3-inch, 2013 Version)');
        item.model = 'APPLE-MACBOOK-AIR-13.3-2013';
        await expect(Products.save(item)).rejects.toThrow('Access Denied');
    });

    it('should validate create access', async () => {
        const Products = context.model('Product');
        // set context user
        Object.assign(context, {
            user: {
                name: 'christina.ali@example.com'
        }});
        const orderedItem = await Products.where('name').equal(
            'Apple MacBook Air (13.3-inch, 2013 Version)'
        ).getItem();
        expect(orderedItem).toBeTruthy();
        const customer = await context.model('People').where('user/name')
            .equal('christina.ali@example.com')
            .getItem();
        expect(customer).toBeTruthy();
        const Orders = context.model('Order');
        let newOrder = {
            orderedItem,
            customer
        };
        await expect(Orders.save(newOrder)).resolves.toBeTruthy();
        // try to place an order with different status (should fail)
        const orderStatus = {
            name: 'Pickup'
        }
        await expect(Orders.save({
            orderedItem,
            customer,
            orderStatus
        })).rejects.toThrow('Access Denied');
    });

    it('should validate update access', async () => {
        await context.model('ActionStatusType').getItems()
        const Products = context.model('Product');
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
        const user1 = await context.model('User').find(user)
            .expand('groups').silent().getItem();
        expect(user1).toBeTruthy();
        expect(user1.groups).toBeTruthy();
        const orderedItem = await Products.where('name').equal(
            'Lenovo Yoga 2 Pro'
        ).getItem();
        expect(orderedItem).toBeTruthy();
        const customer = await context.model('People').where('user/name')
            .equal('christina.ali@example.com')
            .getItem();
        expect(customer).toBeTruthy();
        const agent = await context.model('People').where('user/name')
            .equal(user.name)
            .getItem();
        expect(agent).toBeTruthy();
        const OrderActions = context.model('OrderAction');
        let newAction: { id?: number, agent: any; orderedItem: any; customer: any } = {
            orderedItem,
            customer,
            agent
        };
        await expect(OrderActions.save(newAction)).resolves.toBeTruthy();
        // try to update the action (should fail)
        const { id } = newAction;
        const updateAction = await OrderActions.where('id').equal(id).getItem();
        expect(updateAction).toBeTruthy();
        updateAction.actionStatus = {
            alternateName: 'CompletedActionStatus'
        };
        await expect(OrderActions.save(updateAction)).rejects.toThrow('Access Denied');

        expect(updateAction).toBeTruthy();
        updateAction.actionStatus = {
            alternateName: 'ActiveActionStatus'
        };
        await expect(OrderActions.save(updateAction)).resolves.toBeTruthy();

    });

    it('should get items based on user access', async () => {
        context.user = {
            name: 'jane.keene@example.com'
        };
        const q = await context.model('Person').filterAsync(
            { $filter: 'address/addressRegion eq regions()'}
        );

        const user = await context.model('User').asQueryable()
            .select('id', 'name')
            .where('name').equal(context.user.name)
            .expand('userRegions').silent().getItem();

        expect(q).toBeTruthy();
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(user.userRegions.some((region: string) => region === item.address.addressRegion)).toBeTruthy();
        }
    });

    it('should get items using queryable method', async () => {
        context.user = {
            name: 'jane.keene@example.com'
        };
        const q = await context.model('Person').filterAsync(
            { $filter: 'address/addressRegion eq userRegions()'}
        );

        const user = await context.model('User').asQueryable()
            .select('id', 'name')
            .where('name').equal(context.user.name)
            .expand('userRegions').silent().getItem();

        expect(q).toBeTruthy();
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(user.userRegions.some((region: string) => region === item.address.addressRegion)).toBeTruthy();
        }
    });

});
