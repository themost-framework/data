import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';

describe('HasParentJunction', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        app.getConfiguration().getSourceAt('adapters').unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    });

    it('should insert parent item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newUser;
            await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newUser = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await newUser.property('groups').insert({
                name: 'Contributors'
            });
            newUser = await context.model('User').where('name').equal('luis.nash@example.com').expand('groups').getTypedItem();
            expect(newUser.groups).toBeInstanceOf(Array);
            expect(newUser.groups.length).toBeTruthy();
            const group = newUser.groups.find((item: any) => item.name === 'Contributors');
            expect(group).toBeTruthy();

            const invalidGroup = {
                name: 'InvalidGroup'
            };
            await expect(newUser.property('groups').insert(invalidGroup)).rejects.toThrowError('An associated object cannot be found');

        });
    });

    it('should try insert parent item', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newUser;
            await context.model('Group').silent().save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newUser = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await expect(newUser.property('groups').insert({
                name: 'Contributors'
            })).rejects.toThrowError('Access Denied');

            const invalidGroup = {
                name: 'InvalidGroup'
            };
            await expect(newUser.property('groups').insert(invalidGroup)).rejects.toThrowError('An associated object cannot be found');

        });
    });

    it('should remove parent item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newUser;
            await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newUser = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await newUser.property('groups').insert({
                name: 'Contributors'
            });

            newUser = await context.model('User').where('name').equal('luis.nash@example.com').expand('groups').getTypedItem();
            expect(newUser.groups).toBeInstanceOf(Array);
            let group = newUser.groups.find((item: any) => item.name === 'Contributors');
            expect(group).toBeTruthy()

            await newUser.property('groups').remove({
                name: 'Contributors'
            });

            newUser = await context.model('User').where('name').equal('luis.nash@example.com').expand('groups').getTypedItem();
            expect(newUser.groups).toBeInstanceOf(Array);
            group = newUser.groups.find((item: any) => item.name === 'Contributors');
            expect(group).toBeFalsy();

        });
    });

    it('should try remove parent item', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newUser;
            await context.model('Group').silent().save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newUser = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await newUser.property('groups').silent().insert({
                name: 'Contributors'
            });

            newUser = await context.model('User').where('name')
                .equal('luis.nash@example.com')
                .expand('groups')
                .getTypedItem();
            expect(newUser.groups).toBeInstanceOf(Array);
            let group = newUser.groups.find((item: any) => item.name === 'Contributors');
            expect(group).toBeTruthy()

            await expect(newUser.property('groups').remove({
                name: 'Contributors'
            })).rejects.toThrowError('Access Denied');

        });
    });

    it('should remove all', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user;
            await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            function getUser() {
                return context.model('User').where('name').equal('luis.nash@example.com').expand('groups').getTypedItem();
            }
            /**
             * @type {DataObject}
             */
            user = await getUser();
            await user.property('groups').insert({
                name: 'Contributors'
            });
            user = await getUser();
            expect(user.groups).toBeInstanceOf(Array);
            expect(user.groups.length).toBeTruthy();
            await user.property('groups').removeAll();
            user = await getUser();
            expect(user.groups).toBeInstanceOf(Array);
            expect(user.groups.length).toBeFalsy();

        });
    });

});
