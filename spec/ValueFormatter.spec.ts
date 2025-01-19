import {TestApplication, TestApplication2} from './TestApplication';
import { DataContext, ValueFormatter } from '@themost/data';

describe('ValueFormatter', () => {
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

    it('should use $now function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value = await formatter.format({
            $now: []
        });
        expect(value instanceof Date).toBeTruthy();
    });

    it('should use $randomString function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomString: [
                10
            ]
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(10);
    });

    it('should use $randomString with named params', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomString: {
                length: 10
            }
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(10);
    });

    it('should use $randomInt with named params', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomInt: {
                min: 10,
                max: 20
            }
        });
        expect(typeof value === 'number').toBeTruthy();
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(20);
    });

    it('should use $randomPassword function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomPassword: [
                16
            ]
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(16);
    });

});