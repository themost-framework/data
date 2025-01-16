import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';
import { DataCacheStrategy } from '../data-cache';
import { MemoryCacheStrategy } from '@themost/data/platform-server';
import { SchemaLoaderStrategy } from '../data-configuration';

describe('MemoryCacheEntry', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        app.getConfiguration().useStrategy(
            DataCacheStrategy,
            MemoryCacheStrategy
        )
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should create memory cache entry', async () => {
        const schema = context.getConfiguration().getStrategy(SchemaLoaderStrategy);
        const model = schema.getModelDefinition('Group');
        model.caching = 'always';
        schema.setModelDefinition(model);
        const Groups = context.model('Group');
        let items = await Groups.getItems();
        expect(items).toBeTruthy();
        for (let i = 0; i < 10; i++) {
            items = await Groups.getItems();
        }
    });

    it('should delete memory cache entry', async () => {
        const schema = context.getConfiguration().getStrategy(SchemaLoaderStrategy);
        const model = schema.getModelDefinition('Group');
        model.caching = 'always';
        schema.setModelDefinition(model);
        const Groups = context.model('Group');
        await Groups.getItems();
        const cache: any = app.getConfiguration().getStrategy(DataCacheStrategy);
        await cache.remove('/Group/*');

    });
});