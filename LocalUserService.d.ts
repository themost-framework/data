import { UserService } from "./UserService";

export declare class LocalUserService extends UserService {
    constructor(app: any);
    finalizeAsync(): Promise<void>;
    removeUser(name: any): Promise<void>;
}