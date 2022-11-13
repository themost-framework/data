import { SelectParser, OrderByParser } from '../select-parser';

describe('SelectParser', () => {
    it('should split $select statement #1', async () => {
        let items = await new SelectParser().splitAsync(null);
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toEqual(0);

        items = await new SelectParser().splitAsync('name');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);

        items = await new SelectParser().splitAsync('name as objectName');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
        
        items = await new SelectParser().splitAsync('id,name,dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'dateCreated',
            'dateModified'
        ]);
    });
    it('should use SelectParser.split()', () => {
        let items = new SelectParser().split(null);
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toEqual(0);

        items = new SelectParser().split('name');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);

        items = new SelectParser().split('name as objectName');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
        
        items = new SelectParser().split('id,name,dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'dateCreated',
            'dateModified'
        ]);
        items = new SelectParser().split('id,name,date(dateCreated) as dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'date(dateCreated) as dateCreated',
            'dateModified'
        ]);
        items = new SelectParser().split('id,indexOf(name, \'value\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value\')',
            'dateModified'
        ]);
        items = new SelectParser().split('id,indexOf(name, \'value with comma, inside\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value with comma, inside\')',
            'dateModified'
        ]);
        items = new SelectParser().split('id,indexOf(name, \'value with paren ( inside\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value with paren ( inside\')',
            'dateModified'
        ]);
        items = new SelectParser().split('id,indexof(name,\'value with quotes \'\' inside\'),dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexof(name,\'value with quotes \'\' inside\')',
            'dateCreated',
            'dateModified'
        ]);
    });
    it('should split $select statement #2', async () => {
        const items = await new SelectParser().splitAsync('id,name,date(dateCreated) as dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'date(dateCreated) as dateCreated',
            'dateModified'
        ]);
    });
    it('should split $select statement with alias', async () => {
        const items = await new SelectParser().splitAsync('familyName as lastName,givenName as firstName');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'familyName as lastName',
            'givenName as firstName'
        ]);
    });

    it('should split $select statement with methods', async () => {
        let items = await new SelectParser().splitAsync('id,name,indexof(name,\'value\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value\') as findIndex'
        ]);
        items = await new SelectParser().splitAsync('id,name,indexof(name,\'value with comma,\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value with comma,\') as findIndex'
        ]);
        items = await new SelectParser().splitAsync('id,name,indexof(name,\'value with quotes \'\' inside\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value with quotes \'\' inside\') as findIndex'
        ]);
    });

    it('should split $orderby', async () => {
        const items = await new OrderByParser().splitAsync('familyName asc,givenName desc');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'familyName asc',
            'givenName desc'
        ]);
    });
});