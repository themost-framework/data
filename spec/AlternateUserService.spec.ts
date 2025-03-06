import {TestApplication} from './TestApplication';
import { DataContext } from '@themost/data';
import { resolve } from 'path';
import { LocalUserService } from './LocalUserService';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { UserService } from '../UserService';

describe('TestUserService', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(process.cwd(), 'spec/test2'));
        app.useStrategy(UserService, LocalUserService);
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        const userService = app.getService(UserService);
        if (userService instanceof LocalUserService) {
            await userService.finalizeAsync();
        }
        await app.finalize();
    });

    it('should return user', async () => {
        const userService = app.getService(UserService);
        let user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(user).toBeTruthy();
        expect(user.name).toBe('alexis.rees@example.com');
        user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(user).toBeTruthy();
    });

    it('should return anonymous user', async () => {
        const userService = app.getService(UserService);
        const getItemSpy = jest.spyOn(LocalUserService.prototype, 'getAnonymousUser');
        let anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).toHaveBeenCalled();
        expect(anonymous).toBeTruthy();
        getItemSpy.mockClear();
        expect(anonymous.name).toBe('anonymous');
        anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).not.toHaveBeenCalled();
    });

    it('should refresh anonymous user', async () => {
        const userService = app.getService(UserService);
        let anonymous = await userService.getAnonymousUser(context);
        expect(anonymous).toBeTruthy();
        userService.refreshAnonymousUser$.next(anonymous);
        const getItemSpy = jest.spyOn(LocalUserService.prototype, 'getAnonymousUser');
        getItemSpy.mockClear();
        anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).not.toHaveBeenCalled();
    });

});