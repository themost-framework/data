import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext} from '../index';
import {resolve} from 'path';
import {TestUtils} from './adapter/TestUtils';

describe('DataModel.upsert', () => {
    let app: TestApplication;
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
    it('should use upsert() to insert or update a single item', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const AccessLevelTypes = context.model('AccessLevelType');
            const item = {
                "id": 350,
                "name": "Review",
                "alternateName": "review"
            };
            await expect(AccessLevelTypes.upsert(item)).rejects.toThrow('Access Denied');
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
            });
            const result = await AccessLevelTypes.upsert(item);
            expect(Array.isArray(result)).toBeFalsy();
            const inserted = await AccessLevelTypes.where('id').equal(item.id).getItem();
            expect(inserted).toBeTruthy();
            expect(inserted.id).toEqual(item.id);
            Object.assign(context, {
                user: null
            });
        });
    });

    it('should use upsert() to insert or update multiple items', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const AccessLevelTypes = context.model('AccessLevelType');
            const items = [
                {
                    "id": 350,
                    "name": "Review",
                    "alternateName": "review"
                },
                {
                    "id": 360,
                    "name": "Merge",
                    "alternateName": "merge"
                }
            ];
            await expect(AccessLevelTypes.upsert(items)).rejects.toThrow('Access Denied');
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
            });
            const result = await AccessLevelTypes.upsert(items);
            expect(Array.isArray(result)).toBeTruthy();
            let inserted = await AccessLevelTypes.where('id').equal(350).getItem();
            expect(inserted).toBeTruthy();
            inserted = await AccessLevelTypes.where('id').equal(360).getItem();
            expect(inserted).toBeTruthy();
            // update
            inserted.name = 'Review and merge';
            await AccessLevelTypes.upsert(inserted);
            inserted = await AccessLevelTypes.where('id').equal(360).getItem();
            expect(inserted).toBeTruthy();
            expect(inserted.name).toEqual('Review and merge');

            Object.assign(context, {
                user: null
            });
        });
    });
});
