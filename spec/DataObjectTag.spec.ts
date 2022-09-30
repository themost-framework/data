import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';

describe('DataObjectTag', () => {
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

    it('should insert item', async () => {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            /**
             * @type {DataObject}
             */
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await user.property('tags').insert([
                'NewUser',
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(user.tags).toBeInstanceOf(Array);
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
            /**
             * @type {DataObject}
             */
            let user = await context.model('User').where('name').equal('luis.nash@example.com').getTypedItem();
            await user.property('tags').insert([
                'NewUser',
                'ValidUser'
            ]);
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(user.tags).toBeInstanceOf(Array);
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
            expect(user.tags).toBeInstanceOf(Array);
            expect(user.tags).toEqual([
                'NewUser'
            ]);

            await user.property('tags').removeAll();
            user = await context.model('User')
                .where('name').equal('luis.nash@example.com')
                .expand('tags')
                .getTypedItem();
            expect(user.tags).toBeInstanceOf(Array);
            expect(user.tags.length).toBeFalsy();

        });
    });

});
