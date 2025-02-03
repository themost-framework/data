import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../types';

describe('HasParentJunction', () => {
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
            expect(Array.isArray(newUser.groups)).toBeTruthy();
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
            expect(Array.isArray(newUser.groups)).toBeTruthy();
            let group = newUser.groups.find((item: any) => item.name === 'Contributors');
            expect(group).toBeTruthy()

            await newUser.property('groups').remove({
                name: 'Contributors'
            });

            newUser = await context.model('User').where('name').equal('luis.nash@example.com').expand('groups').getTypedItem();
            expect(Array.isArray(newUser.groups)).toBeTruthy();
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

            // try to remove before set
            await expect(newUser.property('groups').silent().remove({
                name: 'Contributors'
            })).rejects.toThrow('The association cannot be found or access is denied');

            await newUser.property('groups').silent().insert({
                name: 'Contributors'
            });

            newUser = await context.model('User').where('name')
                .equal('luis.nash@example.com')
                .expand('groups')
                .getTypedItem();
            expect(Array.isArray(newUser.groups)).toBeTruthy();
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
            expect(Array.isArray(user.groups)).toBeTruthy();
            expect(user.groups.length).toBeTruthy();
            await user.property('groups').removeAll();
            user = await getUser();
            expect(Array.isArray(user.groups)).toBeTruthy();
            expect(user.groups.length).toBeFalsy();

        });
    });

});
