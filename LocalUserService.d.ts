import { UserService, OnFinalizeService, OnRemoveUser } from "./UserService";

export declare class LocalUserService extends UserService implements OnFinalizeService, OnRemoveUser {
    constructor(app: any);
    finalizeAsync(): Promise<void>;
    removeUser(name: any): Promise<void>;
}