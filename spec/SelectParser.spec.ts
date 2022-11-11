import { SelectParser, OrderByParser } from '../select-parser';

describe('SelectParser', () => {
    it('should split $select statement #1', async () => {
        const items = await new SelectParser().parseAsync('id,name,dateCreated,dateModified');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
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
        const items = await new SelectParser().parseAsync('id,name,indexof(name,\'admin\') as findIndex');
        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual([
            'id',
            'name',
            'indexof(name,\'admin\') as findIndex'
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