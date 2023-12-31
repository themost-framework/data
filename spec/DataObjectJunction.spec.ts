import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../types';

describe('DataObjectJunction', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    });

    it('should insert item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newGroup = await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            expect(newGroup).toBeTruthy();
            /**
             * @type {DataObject}
             */
            newGroup = await context.model('Group').where('name').equal('Contributors').getTypedItem();
            await newGroup.property('members').insert({
                name: 'luis.nash@example.com'
            });
            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(1);
            const member = newGroup.members[0];
            expect(member).toBeTruthy();
            expect(member.name).toEqual('luis.nash@example.com');

            const invalidUser = {
                name: 'invalid.user@example.com'
            };
            await expect(newGroup.property('members').insert(invalidUser)).rejects.toThrowError('An associated object cannot be found');

        });
    });

    it('should insert item silently', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let newGroup = await context.model('Group').silent().save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            expect(newGroup).toBeTruthy();
            /**
             * @type {DataObject}
             */
            newGroup = await context.model('Group').where('name').equal('Contributors').silent().getTypedItem();
            await newGroup.property('members').silent().insert({
                name: 'luis.nash@example.com'
            });
            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').silent().getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(1);
            const member = newGroup.members[0];
            expect(member).toBeTruthy();
            expect(member.name).toEqual('luis.nash@example.com');

            const invalidUser = {
                name: 'invalid.user@example.com'
            };
            await expect(newGroup.property('members').silent().insert(invalidUser)).rejects.toThrowError('An associated object cannot be found');

        });
    });

    it('should remove item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newGroup: any;
            await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newGroup = await context.model('Group').where('name').equal('Contributors').getTypedItem();
            await newGroup.property('members').insert({
                name: 'luis.nash@example.com'
            });
            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(1);

            await newGroup.property('members').remove({
                name: 'luis.nash@example.com'
            });

            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(0);

            const invalidUser = {
                name: 'invalid.user@example.com'
            };
            await expect(newGroup.property('members').remove(invalidUser)).rejects.toThrowError('An associated object cannot be found');
        });
    });

    it('should remove all items', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newGroup = await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newGroup = await context.model('Group').where('name').equal('Contributors').getTypedItem();
            await newGroup.property('members').insert({
                name: 'luis.nash@example.com'
            });
            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(1);

            await newGroup.property('members').removeAll();

            newGroup = await context.model('Group').where('name').equal('Contributors').expand('members').getTypedItem();
            expect(Array.isArray(newGroup.members)).toBeTruthy();
            expect(newGroup.members.length).toEqual(0);
        });
    });

    it('should try to remove disconnected item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newGroup = await context.model('Group').save({
                name: 'Contributors',
                alternateName: 'contributors'
            });
            /**
             * @type {DataObject}
             */
            newGroup = await context.model('Group').where((x: any) => x.name === 'Contributors').getTypedItem();
            await expect(newGroup.property('members').remove({
                name: 'luis.nash@example.com'
            })).rejects.toThrow('The association cannot be found or access is denied');
        });
    });

});
