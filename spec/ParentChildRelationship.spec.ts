import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';
import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../types';

describe('ParentChildRelationship', () => {
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
            const item = await context.model('Place').where((x: any, name: string) => {
                return x.name === name;
            }, {
                name: newItem.name
            }).expand((x: any) => x.containedIn).silent().getItem();
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

    it('should expand parent', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const parentItem = {
                name: 'Settings',
                url: 'https://example.com/admin/settings'
            }
            await context.model('NavigationElement').silent().save(parentItem);
            const newItem = {
                name: 'Users',
                url: 'https://example.com/admin/settings/users',
                scope: 'admin',
                parent: parentItem
            }
            await context.model('NavigationElement').silent().save(newItem);
            const query = await context.model('NavigationElement').filterAsync({
                $filter: 'url eq \'https://example.com/admin/settings/users\'',
                $expand: 'parent($select=id,name,url)'
            });
            const item = await query.silent().getItem();
            expect(item.parent).toBeTruthy();
            expect(item.parent.url).toEqual('https://example.com/admin/settings');
        });
    });

});
