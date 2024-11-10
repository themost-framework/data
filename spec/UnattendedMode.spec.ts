import {TestApplication, TestApplication2} from './TestApplication';
import {
    DataContext,
    disableUnattendedExecution,
    enableUnattendedExecution,
    executeInUnattendedModeAsync
} from '@themost/data';

describe('UnattendedMode', () => {
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
    it('should execute in unattended mode', async () => {
        // set context user
        context.user = {
            name: 'angela.parry@example.com'
        };
        const items = await context.model('Order').where<any>(
            (x) => x.orderedItem.name === 'Razer Blade (2013)'
        ).getItems();
        expect(items.length).toBeFalsy();
        await executeInUnattendedModeAsync(context, async () => {
            expect(context.interactiveUser).toBeTruthy();
            expect(context.interactiveUser.name).toEqual('angela.parry@example.com');
            const items = await context.model('Order').where<any>(
                (x) => x.orderedItem.name === 'Razer Blade (2013)'
            ).getItems();
            expect(items.length).toBeTruthy();
        });
        expect(context.interactiveUser).toBeFalsy();
    });

    it('should execute in unattended mode and get error', async () => {
        // set context user
        context.user = {
            name: 'angela.parry@example.com'
        };
        await expect(executeInUnattendedModeAsync(context, async () => {
            throw new Error('Custom error');
        })).rejects.toThrow();
        expect(context.interactiveUser).toBeFalsy();
        expect(context.user.name).toEqual('angela.parry@example.com');
    });

    it('should execute in unattended mode in series', async () => {
        // set context user
        context.user = {
            name: 'angela.parry@example.com'
        };
        await executeInUnattendedModeAsync(context, async () => {
            expect(context.interactiveUser).toBeTruthy();
            const items = await context.model('Order').where<any>(
                (x) => x.orderedItem.name === 'Razer Blade (2013)'
            ).getItems();
            expect(items.length).toBeTruthy();
            await executeInUnattendedModeAsync(context, async () => {
                expect(context.interactiveUser).toBeTruthy();
                expect(context.interactiveUser.name).toEqual('angela.parry@example.com');
                const items = await context.model('Order').where<any>(
                    (x) => x.orderedItem.name === 'Sony VAIO Flip 15'
                ).getItems();
                expect(items.length).toBeTruthy();
            });
        });
        expect(context.interactiveUser).toBeFalsy();
        expect(context.user.name).toEqual('angela.parry@example.com');
    });

    it('should disable unattended execution', async () => {
        // set context user
        context.user = {
            name: 'angela.parry@example.com'
        };
        disableUnattendedExecution(app);
        expect(app.getConfiguration().getSourceAt('settings/auth/unattendedExecutionAccount')).toBeFalsy();
        await expect(executeInUnattendedModeAsync(context, async () => {
            await context.model('Order').where<any>(
                (x) => x.orderedItem.name === 'Sony VAIO Flip 15'
            ).getItems();
        })).rejects.toThrow('The unattended execution account is not defined. The operation cannot be completed.');
        expect(context.interactiveUser).toBeFalsy();
        enableUnattendedExecution(app);
        expect(app.getConfiguration().getSourceAt('settings/auth/unattendedExecutionAccount')).toBeTruthy();
        await executeInUnattendedModeAsync(context, async () => {
            const items = await context.model('Order').where<any>(
                (x) => x.orderedItem.name === 'Razer Blade (2013)'
            ).getItems();
            expect(items.length).toBeTruthy();
        });
    });
});
