import {TestUtils} from './adapter/TestUtils';
import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../types';
import {DataObject} from '../data-object';
import {DataObjectTag} from '../data-object-tag';

describe('DataObjectTag', () => {
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

    it('should insert item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await user.property('tags').insert([
                'NewUser',
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags.length).toEqual(2);
            expect(user.tags).toEqual([
                'NewUser',
                'ValidUser'
            ]);
        });
    });

    it('should try to insert item', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await expect(user.property('tags').insert([
                'NewUser',
                'ValidUser'
            ])).rejects.toThrowError('Access Denied');

            await user.property('tags').silent().insert([
                'NewUser',
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags.length).toEqual(2);
            expect(user.tags).toEqual([
                'NewUser',
                'ValidUser'
            ]);
        });
    });

    it('should remove item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await user.property('tags').insert([
                'NewUser',
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags).toEqual([
                'NewUser',
                'ValidUser'
            ]);
            await user.property('tags').remove([
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();  
            expect(user.tags).toEqual([
                'NewUser'
            ]);

            await user.property('tags').removeAll();
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags.length).toBeFalsy();

        });
    });

    it('should try to remove item', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            const tags: DataObjectTag = user.property('tags').silent();
            await tags.insert([
                'NewUser',
                'ValidUser'
            ]);
            await expect(user.property('tags').remove([
                'ValidUser'
            ])).rejects.toThrowError('Access Denied');
            user = await context.model('User')
            .where('name').equal('luis.nash@example.com')
            .expand('tags')
            .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags.length).toEqual(2);
            expect(user.tags).toEqual([
                'NewUser',
                'ValidUser'
            ]);
        });
    });

    it('should try to remove all', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await user.property('tags').silent().insert([
                'NewUser',
                'ValidUser'
            ]);
            await expect(user.property('tags').removeAll()).rejects.toThrowError('Access Denied');

            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(Array.isArray(user.tags)).toBeTruthy();
            expect(user.tags.length).toEqual(2);
            expect(user.tags).toEqual([
                'NewUser',
                'ValidUser'
            ]);
        });
    });

    it('should try to delete parent', async () => {
        await TestUtils.executeInTransaction(context, async () => {

            const Users = context.model('User').silent()
            await Users.save({
                name: 'test.user@example.com'
            })
            let user = await Users.where('name').equal('test.user@example.com').getTypedItem();
            await user.property('tags').silent().insert([
                'NewUser',
                'ValidUser'
            ]);
            await expect(Users.remove(user)).resolves.toBeUndefined();
        });
    });

    it('should try to insert json objects', async () => {
        const PeopleAudience = context.model('PeopleAudience').silent();
        const newAudience = {
            name: 'Top customers',
            preferredName: [
                { recordLanguage: 'en',  value: 'Top customers' },
                { recordLanguage: 'fr',  value: 'Meilleurs clients' }
            ]
        };
        await PeopleAudience.save(newAudience)
        let audience = await PeopleAudience
            .where((x: { name: string })=> {
                return x.name === 'Top customers';
            })
            .expand((x: { preferredName: unknown }) => x.preferredName)
            .getTypedItem();
        expect(audience).toBeTruthy();
        expect(Array.isArray(audience.preferredName)).toBeTruthy();
        const preferredName = audience.preferredName.find((x) => x.recordLanguage === 'en');
        expect(preferredName).toBeTruthy();

        audience = await PeopleAudience
            .where((x: { preferredName: { value: string } }) => {
                return x.preferredName.value === 'Meilleurs clients';
            }).equal('Meilleurs clients')
            .getTypedItem();
        expect(audience).toBeTruthy();

    });

});
