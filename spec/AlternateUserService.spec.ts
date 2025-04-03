import {TestApplication} from './TestApplication';
import { DataContext } from '@themost/data';
import { resolve } from 'path';
import { LocalUserService } from '../LocalUserService';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../UserService';
import '@themost/promise-sequence';
import { performance } from 'perf_hooks';
import { TraceUtils } from '@themost/common';

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
        const userService = app.getService(UserService) as LocalUserService;
        const getItemSpy = jest.spyOn(UserService.prototype, 'getUser');
        let user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(user).toBeTruthy();
        expect(user.name).toBe('alexis.rees@example.com');
        expect(getItemSpy).toHaveBeenCalled();
        getItemSpy.mockClear();
        user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(getItemSpy).not.toHaveBeenCalled();
        expect(user).toBeTruthy();
        await userService.removeUser('alexis.rees@example.com');
        getItemSpy.mockClear();
        user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(getItemSpy).toHaveBeenCalled();
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

    it('should return cached items', async () => {
        const Users = context.model('User');
        const items = await Users.asQueryable().select((x: any) => {
            return {
                name: x.name
            }
        }).take(50).silent().getItems();
        const userService = app.getService(UserService);
        let start  = performance.now();
        await Promise.sequence(items.map((x: any) => {
            return () => userService.getUser(context, x.name);
        }));
        let end = performance.now();
        TraceUtils.log(`Elapsed time: ${(end-start).toFixed(2)} ms`);
        const getItemSpy = jest.spyOn(UserService.prototype, 'getUser');
        getItemSpy.mockClear();
        start  = performance.now();
        await Promise.sequence(items.map((x: any) => {
            return () => userService.getUser(context, x.name);
        }));
        end = performance.now();
        TraceUtils.log(`Elapsed time from cache: ${(end-start).toFixed(2)} ms`);
        start  = performance.now();
        await Promise.all(items.map((x: any) => {
            return userService.getUser(context, x.name);
        }));
        end = performance.now();
        TraceUtils.log(`Elapsed time from cache: ${(end-start).toFixed(2)} ms`);
        expect(getItemSpy).not.toHaveBeenCalled();
    });

});