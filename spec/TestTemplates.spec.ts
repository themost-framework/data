import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';
const executeInTransaction = TestUtils.executeInTransaction;

interface DataContextWithUser extends DataContext {
    user: any
}

describe('TestTemplate', () => {
    let app: TestApplication;
    let context: DataContextWithUser;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext() as DataContextWithUser;
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });
    afterEach(() => {
        delete context.user;
    });

    it('should test something', async () => {
        await executeInTransaction(context, async () => {
            
        });
    });
});