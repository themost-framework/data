import { SelectParser, OrderByParser } from '../select-parser';

describe('SelectParser', () => {
    it('should split $select statement #1', async () => {
        let items = await new SelectParser().parseAsync(null);
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toEqual(0);

        items = await new SelectParser().parseAsync('name');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);

        items = await new SelectParser().parseAsync('name as objectName');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
        
        items = await new SelectParser().parseAsync('id,name,dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'dateCreated',
            'dateModified'
        ]);
    });
    it('should use SelectParser.parse()', () => {
        let items = new SelectParser().parse(null);
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toEqual(0);

        items = new SelectParser().parse('name');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);

        items = new SelectParser().parse('name as objectName');
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBeGreaterThan(0);
        
        items = new SelectParser().parse('id,name,dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'dateCreated',
            'dateModified'
        ]);
        items = new SelectParser().parse('id,name,date(dateCreated) as dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'date(dateCreated) as dateCreated',
            'dateModified'
        ]);
        items = new SelectParser().parse('id,indexOf(name, \'value\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value\')',
            'dateModified'
        ]);
        items = new SelectParser().parse('id,indexOf(name, \'value with comma, inside\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value with comma, inside\')',
            'dateModified'
        ]);
        items = new SelectParser().parse('id,indexOf(name, \'value with paren ( inside\'),dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexOf(name, \'value with paren ( inside\')',
            'dateModified'
        ]);
        items = new SelectParser().parse('id,indexof(name,\'value with quotes \'\' inside\'),dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'indexof(name,\'value with quotes \'\' inside\')',
            'dateCreated',
            'dateModified'
        ]);
    });
    it('should split $select statement #2', async () => {
        const items = await new SelectParser().parseAsync('id,name,date(dateCreated) as dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'date(dateCreated) as dateCreated',
            'dateModified'
        ]);
    });
    it('should split $select statement with alias', async () => {
        const items = await new SelectParser().parseAsync('familyName as lastName,givenName as firstName');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'familyName as lastName',
            'givenName as firstName'
        ]);
    });

    it('should split $select statement with methods', async () => {
        let items = await new SelectParser().parseAsync('id,name,indexof(name,\'value\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value\') as findIndex'
        ]);
        items = await new SelectParser().parseAsync('id,name,indexof(name,\'value with comma,\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value with comma,\') as findIndex'
        ]);
        items = await new SelectParser().parseAsync('id,name,indexof(name,\'value with quotes \'\' inside\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'value with quotes \'\' inside\') as findIndex'
        ]);
    });

    it('should split $orderby', async () => {
        const items = await new OrderByParser().parseAsync('familyName asc,givenName desc');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'familyName asc',
            'givenName desc'
        ]);
    });
});