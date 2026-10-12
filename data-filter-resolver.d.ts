
export declare class DataFilterResolver {
    resolveMember(member: string, callback: (err?: Error, res?: any) => void): void;
    resolveMethod(name: string, args: Array<any>, callback: (err?: Error, res?: any) => void): void;
    me(callback: (err?: Error, res?: any) => void): void;
    user(callback: (err?: Error, res?: any) => void): void;
    now(callback: (err?: Error, res?: Date) => void): void;
    today(callback: (err?: Error, res?: Date) => void): void;
    lang(callback: (err?: Error, res?: string) => void): void;

}

export class EdmFilter {
    static func(): MethodDecorator;
}
