import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';
import { TestApplication } from './TestApplication';
import { DataContext } from '../types';
import { Guid } from '@themost/common';

describe('DataAssociationPrivileges', () => {
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
    })
    it('should set associated object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: {
                    name: 'christina.ali@example.com'
                }
            });
            let user = await context.model('User').where('name').equal('christina.ali@example.com').getItem();
            expect(user).toBeTruthy();

            const UserActivationActions = context.model('UserActivationAction').silent();
            const activationAction: any = {
                object: user,
                activationCode: Guid.newGuid().toString()
            };
            await UserActivationActions.save(activationAction);
            const {id} = activationAction;
            const item = await UserActivationActions.where('id').equal(id).getItem();
            expect(item).toBeTruthy();

            user = await context.model('User').where('name').equal('christina.ali@example.com')
                .expand('lastActivation')
                .getItem();
            expect(user).toBeTruthy();
            expect(user.lastActivation).toBeFalsy();
        });
    });

    it('should get null associated attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: {
                    name: 'christina.ali@example.com'
                }
            });
            let user = await context.model('User').where('name').equal('christina.ali@example.com').getItem();
            expect(user).toBeTruthy();
            // add user activation action
            const UserActivationActions = context.model('UserActivationAction').silent();
            const activationAction: any = {
                object: user,
                activationCode: Guid.newGuid().toString()
            };
            await UserActivationActions.save(activationAction);
            // get data
            const data = await context.model('User').where('name').equal('christina.ali@example.com')
                .select(
                    'id',
                    'lastActivation/activationCode as activationCode'
                    )
                .getItem();
            expect(user).toBeTruthy();
            expect(data.activationCode).toBeFalsy();
        });
    });

    

});