import { ApplicationBase, ApplicationService } from '@themost/common';
import { DataContext } from './types';
import { BehaviorSubject, Observable } from 'rxjs';

export declare interface OnFinalizeService {
    finalizeAsync(): Promise<void>;
}

export declare interface OnRemoveUser {
    removeUser(name: string): Promise<void>;
}

export declare class UserService extends ApplicationService {
    
    constructor(app:any);

    getUser(context: DataContext, name: string): Promise<any>;

    getAnonymousUser(context: DataContext): Promise<any>;
    
    getGroup(context: DataContext, name: string): Promise<any>;

    /**
     * An observable that emits the anonymous user data.
     * This can be used to track or handle the state of an anonymous user in the application.
     * 
     * @type {Observable<any>}
     */
    anonymousUser$: Observable<any>;

    refreshAnonymousUser$: BehaviorSubject<any>;
}