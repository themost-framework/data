import {TestUtils} from './adapter/TestUtils';
import { TestAdapter } from './adapter/TestAdapter';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import {DataModelFilterParser} from '../data-model-filter.parser';
import { at } from 'lodash';
import { DataPermissionExclusion } from '../data-permission';
import { DataConfigurationStrategy } from '../data-configuration';
import { ODataConventionModelBuilder } from '../odata';
import { XDocument } from '@themost/xml';

describe('ODataModelBuilder', () => {

    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should get metadata', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document = await service.getEdm();
        expect(document).toBeTruthy();
    });

    it('should exclude hidden entity types', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document = await service.getEdm();
        expect(document).toBeTruthy();
        let entitySet = document.entityContainer.entitySet.find((item) => item.entityType.name === 'User');
        expect(entitySet).toBeTruthy();
        entitySet = document.entityContainer.entitySet.find((item) => item.entityType.name === 'Thing');
        expect(entitySet).toBeFalsy();
    });

    it('should get metadata xml', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'User\']');
        expect(element).toBeTruthy();
        expect(element.getAttribute('BaseType')).toEqual('Account');

        element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'Account\']');
        expect(element).toBeTruthy();
        expect(element.getAttribute('BaseType')).toEqual('Thing');
    });

    it('should include hidden entity types', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'User\']');
        expect(element).toBeTruthy();
        expect(element.getAttribute('BaseType')).toEqual('Account');

        element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'Thing\']');
        expect(element).toBeTruthy();
    });
});