import { TestApplication } from './TestApplication';
import { DataContext } from '../index';
import { resolve } from 'path';

describe('DataObjectAssociationListener', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
        return done();
    });
    afterAll((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });
    it('should validate association', async ()=> {
        const items = await context.model('Person').asQueryable().silent().getItems();
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeTruthy();
    });
});