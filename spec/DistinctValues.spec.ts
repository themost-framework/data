import {TestUtils} from './adapter/TestUtils';
import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../types';

describe('Distinct Values', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should force distinct items using $filter', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();

            await context.model('Group').insert({
                name: 'SpecialAgents'
            })

            await user.property('groups').insert({
                name: 'SpecialAgents'
            });
            user = await context.model('User').where('name').equal('alexis.rees@example.com').getTypedItem();
            await user.property('groups').insert([
                {
                    name: 'SpecialAgents'
                },
                {
                    name: 'Administrators'
                }
            ]);
            const q = await context.model('User').filterAsync({
                $filter: `groups/name eq 'SpecialAgents' or groups/name eq 'Administrators'`,
            });
            const users = await q.getItems();
            expect(users).toBeTruthy();
            expect(users.length).toEqual(2);
        });
    });


    it('should force distinct items using tag filtering', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('lillian.blake@example.com').getTypedItem();
            await user.property('tags').insert([
                'SpecialCustomer',
            ]);
            user = await context.model('User').where('name').equal('kennedy.pearson@example.com').getTypedItem();
            await user.property('tags').insert([
                'SpecialCustomer',
                'TopCustomer'
            ]);
            const q = await context.model('User').filterAsync({
                $filter: `tags/tag eq 'SpecialCustomer' or tags/tag eq 'TopCustomer'`,
            });
            const users = await q.getItems();
            expect(users).toBeTruthy();
            expect(users.length).toEqual(2);
        });
    });

    it('should force distinct items using nested tag filtering', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('lillian.blake@example.com').getTypedItem();
            await user.property('tags').insert([
                'SpecialCustomer',
            ]);
            user = await context.model('User').where('name').equal('kennedy.pearson@example.com').getTypedItem();
            await user.property('tags').insert([
                'SpecialCustomer',
                'TopCustomer'
            ]);
            const q = await context.model('Order').filterAsync({
                $filter: `customer/user/tags/tag eq 'SpecialCustomer' or customer/user/tags/tag eq 'TopCustomer'`,
            });
            const items = await q.getItems();
            expect(items).toBeTruthy();
            expect(items.length).toEqual(3);
        });
    });

    it('should force distinct items using a many-to-many association', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            const q = await context.model('Person').filterAsync({
                $select: 'id,givenName,familyName,email',
                $filter: `orders/orderedItem/name eq 'Asus VivoBook X202E-DH31T' or orders/orderedItem/name eq 'Sony VAIO Flip 15'`,
            });
            const items = await q.getItems();
            const distinctValues = items.reduce((acc, current) => {
                if (!acc.includes(current.email)) {
                    acc.push(current.email);
                }
                return acc;
            }, []);
            expect(items.length).toEqual(distinctValues.length);
        });
    });

    it('should force distinct items using a many-to-many association with identifiers', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            const q = await context.model('Person').filterAsync({
                $select: 'id,givenName,familyName,email',
                $filter: `orders/orderedItem eq 16 or orders/orderedItem eq 18`,
            });
            const items = await q.getItems();
            const distinctValues = items.reduce((acc, current) => {
                if (!acc.includes(current.email)) {
                    acc.push(current.email);
                }
                return acc;
            }, []);
            expect(items.length).toEqual(distinctValues.length);
        });
    });

});
