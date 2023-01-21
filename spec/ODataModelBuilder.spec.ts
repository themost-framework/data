import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
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

    it('should exclude hidden entity sets', async () => {
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

    it('should include hidden entity types when used in functions', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let functionElement = document.documentElement.selectSingleNode('edmx:DataServices/Schema/Function[@Name=\'Comments\']');
        expect(functionElement).toBeTruthy();
        expect(functionElement.selectSingleNode('ReturnType').getAttribute('Type')).toEqual('Collection(UserComment)');

        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'UserComment\']');
        expect(element).toBeTruthy();

        element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityContainer/EntitySet[@EntityType=\'UserComment\']');
        expect(element).toBeFalsy();
    });

    it('should include hidden entity types when used in actions', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let actionElement = document.documentElement.selectSingleNode('edmx:DataServices/Schema/Action[@Name=\'Chats\']');
        expect(actionElement).toBeTruthy();
        expect(actionElement.selectSingleNode('ReturnType').getAttribute('Type')).toEqual('Collection(UserChat)');

        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'UserChat\']');
        expect(element).toBeTruthy();

        element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityContainer/EntitySet[@EntityType=\'UserChat\']');
        expect(element).toBeFalsy();
    });

    it('should include hidden entity types when used in action parameters', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let actionElement = document.documentElement.selectSingleNode('edmx:DataServices/Schema/Action[@Name=\'Review\']');
        expect(actionElement).toBeTruthy();
        const bindingElement = actionElement.selectSingleNode('Parameter[@Name=\'bindingParameter\']');
        expect(bindingElement).toBeTruthy();
        expect(bindingElement.getAttribute('Type')).toEqual('User');
        
        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'UserReview\']');
        expect(element).toBeTruthy();

        element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityContainer/EntitySet[@EntityType=\'UserReview\']');
        expect(element).toBeFalsy();
    });

    it('should include implemented properties', async () => {
        const service: ODataConventionModelBuilder = new ODataConventionModelBuilder(app.getConfiguration());
        const document: XDocument = await service.getEdmDocument();
        expect(document).toBeTruthy();

        let element = document.documentElement.selectSingleNode('edmx:DataServices/Schema/EntityType[@Name=\'ActionStatusType\']');
        expect(element).toBeTruthy();

        let child = element.selectSingleNode('Property[@Name=\'name\']');
        expect(child).toBeTruthy();

    });
});