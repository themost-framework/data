import { DataContext, DataModel, DataQueryable, EdmMapping } from '../../../index';
import { Account } from './Account';

@EdmMapping.entityType()
class User extends Account {

    @EdmMapping.func('Me', 'User')
    static async getMe(context: DataContext) {
        const username = context.user && context.user.name;
        return context.model('User').where((x: { name: string }) => {
            return x.name === username;
        }, {
            username
        });
    }

}

export {
    User
}