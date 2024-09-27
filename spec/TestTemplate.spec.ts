import { TestApplication } from './TestApplication';
import { DataContext } from '@themost/data';
import { resolve } from 'path';
describe('TestTemplate', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });
    it('should use this test', async () => {
        await context.executeInTransactionAsync(async () => {
            expect(true).toBeTruthy();
        });
    });

});
