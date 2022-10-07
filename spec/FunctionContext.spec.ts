import { resolve } from 'path';
import { FunctionContext } from '../functions';
import { DataContext } from '../types';
import { TestApplication } from './TestApplication';
import { Guid } from '@themost/common';

describe('FunctionContext', () => {
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

    it('should create instance', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.now();
        expect(value).toBeInstanceOf(Date);
    });

    it('should get random int', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.int(10, 20);
        expect(typeof value).toEqual('number');
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(20);
    });

    it('should get today value', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.today();
        expect(value).toBeInstanceOf(Date);
    });

    it('should get new guid', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.newGuid();
        expect(value).toBeTruthy();
        expect(Guid.isGuid(value)).toBeTruthy();
    });

    it('should get new password', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.password(12);
        expect(value).toBeTruthy();
        expect(value.replace('{clear}', '').length).toEqual(12);
    });

    it('should get new char sequence', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.chars(12);
        expect(value).toBeTruthy();
        expect(value.length).toEqual(12);
    });

    it('should get new numbers', async() => {
        const functionContext = new FunctionContext(context);
        const value = await functionContext.numbers(12);
        expect(value).toBeTruthy();
        expect(value.length).toEqual(12);
        expect(/^\d+$/).toBeTruthy();
    });

    it('should get user', async() => {
        const functionContext = new FunctionContext(context);
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        const value = await functionContext.user();
        expect(value).toBeTruthy();
    });

});