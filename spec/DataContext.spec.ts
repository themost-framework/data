import { TraceUtils } from "@themost/common";
import { resolve } from "path";
import { DataContext } from "..";
import { TestApplication } from "./TestApplication";

describe('DataContext', () => {
    let app: TestApplication;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
    })
    it('should validate serialization', () => {
        const context = app.createContext();
        expect(context.application).toBeInstanceOf(TestApplication);
        const contextStr = JSON.stringify(context);
        expect(contextStr).toBe('{}');
    });
});