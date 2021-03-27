// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

// eslint-disable-next-line no-unused-vars
const { DataEventArgs } = require('./types');

class DataNestedQueryableListener {
    beforeExecute(event, callback) {
        DataNestedQueryableListener.prototype.beforeExecuteAsync(event).then(function() {
            return callback();
        }).catch(function(err) {
            return callback(err);
        });
    }
    /**
     * @param {DataEventArgs} event 
     */
    async beforeExecuteAsync(event) {
        const query = event.emitter && event.emitter.query;
        const context = event.model.context;
        if (query == null) {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(query, '$expand')) {
            /**
             * @type {{ $entity:{ model:string }} | Array<{ $entity:{ model:string }}>}
             */
            const expand = query.$expand;
            if (Array.isArray(expand)) {
                for(let item of expand) {
                    if (item.$entity && item.$entity.model) {
                        // get nested model
                        const model = context.model(item.$entity.model);
                        // if model exists and it's different from the current model
                        if (model != null && event.model.name !== model.name) {
                            // try to upgrade
                            await model.migrateAsync();
                        }
                    } 
                }
            } else if (expand && expand.$entity && expand.$entity.model) {
                // get nested model
                const model = context.model(expand.$entity.model);
                if (model != null && event.model.name !== model.name) {
                    // try to upgrade
                    await model.migrateAsync();
                }
            }

        }
    }
}

module.exports = {
    DataNestedQueryableListener
}
