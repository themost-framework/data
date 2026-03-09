import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';

describe('Template', () => {

    let app: TestApplication;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

});
