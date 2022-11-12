
export declare class SelectParser {
    parseAsync(str: string): Promise<string[]>;
    parse(str: string): string[];
}

export declare class OrderByParser {
    parseAsync(str: string): Promise<string[]>;
    parse(str: string): string[];
}

export declare class GroupByParser {
    parseAsync(str: string): Promise<string[]>;
}