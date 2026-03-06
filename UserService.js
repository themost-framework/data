const { ApplicationService } = require('@themost/common');
class UserService extends ApplicationService {
  constructor(app) {
    super(app);
  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @param {string} name 
   * @returns {Promise<any>}
   */
  getUser(context, name) {
      // noinspection JSCheckFunctionSignatures
      /**
       * @type {import('./data-cache').DataCacheStrategy}
       */
          // noinspection JSCheckFunctionSignatures
      const cache = context.getConfiguration().getStrategy(function DataCacheStrategy() {});
      if (cache) {
          return cache.getOrDefault(`/User/${name}`, () => {
              return context.model('User').where('name').equal(name).expand('groups').silent().getItem().then((user) => {
                  return user;
              });
          });
      }
      return context.model('User').where('name').equal(name).expand('groups').silent().getItem();
  }

    /**
     * @param {import('@themost/common').DataContextBase} context
     * @param {string} name
     * @returns {Promise<any>}
     */
    getGroup(context, name) {
        // noinspection JSCheckFunctionSignatures
        /**
         * @type {import('./data-cache').DataCacheStrategy}
         */
            // noinspection JSCheckFunctionSignatures
        const cache = context.getConfiguration().getStrategy(function DataCacheStrategy() {});
        if (cache) {
            return cache.getOrDefault(`/Group/${name}`, () => {
                return context.model('Group').asQueryable().where('name').equal(name).silent().getItem();
            });
        }

        return context.model('Group').asQueryable().where('name').equal(name).silent().getItem();
    }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @returns {Promise<any>}
   */
  getAnonymousUser(context) {
      return this.getUser(context, 'anonymous').then((anonymousUser) => {
            if (anonymousUser) {
                Object.assign(anonymousUser, {
                    groups: []
                });
            }
            return anonymousUser;
      });
  }
  
}

module.exports = {
    UserService
};