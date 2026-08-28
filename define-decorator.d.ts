export declare function defineDecorator(proto: Object|Function, key: string, decorator:Function): void;

declare global {
    interface ObjectConstructor {
        defineDecorator(proto: Object|Function, key: string, decorator:Function): void;
    }
}