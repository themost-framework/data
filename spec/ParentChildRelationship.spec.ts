import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication} from './TestApplication';
import {DataContext} from '../types';

describe('ParentChildRelationship', () => {
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

    it('should get mapping', async () => {
        /**
         * @type {import('../types').DataAssociationMapping}
         */
        const mapping = context.model('Place').inferMapping('containedIn');
        expect(mapping.associationType).toEqual('association');
    });

    it('should get null', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const newItem = {
                name: 'Tommy\'s Burgers',
                photo: 'https://example.com/images/TommysBurgers.png',
                branchCode: '001'
            }
            await context.model('Place').silent().save(newItem);
            const item = await context.model('Place').where('name').equal(newItem.name)
                .expand('containedIn').silent().getItem();
            expect(Object.prototype.hasOwnProperty.call(item, 'containedIn')).toBeTruthy();
            expect(item.containedIn).toEqual(null);
        });
    });

    it('should get parent', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const parentItem = {
                name: 'Greenwood Square'
            }
            await context.model('Place').silent().save(parentItem);

            const newItem = {
                name: 'Tommy\'s Burgers',
                photo: 'https://example.com/images/TommysBurgers.png',
                branchCode: '001',
                containedIn: parentItem
            }
            await context.model('Place').silent().save(newItem);

            const item = await context.model('Place').where('name').equal(newItem.name)
                .expand('containedIn').silent().getItem();
            expect(item.containedIn).toBeTruthy();
            expect(item.containedIn.name).toEqual('Greenwood Square');
        });
    });

});
