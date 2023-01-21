import { DataContext, EdmType, EdmMapping } from '../../../index';
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

    @EdmMapping.func('Comments', EdmType.CollectionOf('UserComment'))
    async getComments() {
        const username = this.context.user && this.context.user.name;
        return this.context.model('UserComment').where((x: { commentBy: { name: string } }) => {
            return x.commentBy.name === username;
        }, {
            username
        });
    }

    @EdmMapping.action('Chats', EdmType.CollectionOf('UserChat'))
    async getChats() {
        const username = this.context.user && this.context.user.name;
        return this.context.model('UserComment').where((x: { commentBy: { name: string } }) => {
            return x.commentBy.name === username;
        }, {
            username
        });
    }

    @EdmMapping.param('userReview', 'UserReview', false, true)
    @EdmMapping.action('Review', 'Object')
    async review(userReview: any) {
        await this.context.model('UserReview').save(Object.assign(userReview, {
            user: this.getId()
        }));
        return {
            id: userReview.id
        }
    }

}

export {
    User
}