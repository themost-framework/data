---
title: Handle data model upgrades with event listeners
summary: Learn when beforeUpgrade and afterUpgrade run during automatic model migration, how to register them, and what to expect from their event and callback arguments.
category: Data models
readingTime: 5 minutes
---

# Handle data model upgrades with event listeners

Data models can run listener methods immediately before and after an upgrade. An upgrade reconciles the model definition with its data source. The framework checks for an upgrade when a model is saved and also exposes `migrate()` and `migrateAsync()` for requesting one directly. Changing a model's `version` in its definition makes that version different from the version cached for the model in the current configuration, so the next migration attempt can perform the upgrade.

## Configure the listener

Declare a listener module in the model's `eventListeners` array. As with other model listeners, `type` identifies the module and `name` is an optional label.

```json
{
  "name": "Product",
  "title": "Products",
  "version": "1.1",
  "fields": [
    { "name": "id", "type": "Counter", "primary": true },
    { "name": "name", "type": "Text" }
  ],
  "eventListeners": [
    {
      "name": "Product upgrade tasks",
      "type": "./listeners/product-upgrade-listener"
    }
  ]
}
```

For example, after deploying this definition with a changed `version`, the first `save()` or explicit migration attempt for `Product` can initiate the upgrade. The listener module can export either or both methods:

```js
module.exports = {
  beforeUpgrade(event, callback) {
    // Prepare for the upgrade, if needed.
    console.log(`Starting upgrade for ${event.model.name}`);
    callback();
  },

  afterUpgrade(event, callback) {
    // Run follow-up work after the model migration.
    console.log(`Finished upgrade for ${event.model.name}`);
    callback();
  }
};
```

Each handler uses the callback signature `(event, callback)`. For upgrade events, the framework supplies an event object containing `model`, the `DataModel` being upgraded. It does not populate `target` with a data record. Call `callback()` when the handler is finished, or pass an error to fail the upgrade operation. For asynchronous work, wait for that work to finish before invoking the callback, and invoke it only once.

## Understand the upgrade lifecycle

For a model with a base model, the base model's migration is attempted first. Then the current model's `beforeUpgrade` handlers run in their registration order, followed by the database adapter's migration. If that migration does not set `migration.updated`, the framework runs `afterUpgrade` handlers and then completes the transaction. On successful completion, the current version is recorded in the configuration cache.

The framework registers built-in `afterUpgrade` handlers before configured model listeners: it creates the model view and applies configured seed data. Consequently, custom `afterUpgrade` handlers run after those built-in handlers. Custom listeners for each event are registered in the order they appear in `eventListeners`; the emitter processes callback-based handlers sequentially.

## Know when upgrade handlers do not run

- A matching cached model version short-circuits migration, so neither upgrade event runs.
- A sealed model is not migrated and does not run the upgrade events.
- An abstract model cannot be instantiated for migration; the attempt fails rather than running the handlers.
- If the database adapter marks the migration as `updated`, the framework skips `afterUpgrade`. The `beforeUpgrade` handler has already run.
- A failure in a handler is passed through the migration callback and interrupts the upgrade flow. `afterUpgrade` is not called if an earlier step fails.

Use an explicit migration when upgrade work should not wait for a save:

```js
const productModel = context.model("Product");

productModel.migrateAsync()
  .then((upgraded) => {
    if (upgraded) {
      console.log("Product model was upgraded");
    }
  })
  .catch((error) => {
    console.error("Product model migration failed", error);
  });
```

`migrateAsync()` resolves with a boolean indicating whether the migration was marked updated; it does not mean that every call necessarily ran the upgrade events.

## Summary

Use `beforeUpgrade` for work that must precede a model's database migration and `afterUpgrade` for follow-up work after it. Both handlers receive the model through `event.model` and complete through a callback. A changed `version` is detected on a migration attempt, not when configuration is merely loaded; unchanged cached versions, sealed models, failures, and an adapter-marked updated migration affect whether each event runs. For upgrade actions that should happen promptly, call `migrate()` or `migrateAsync()` explicitly rather than waiting for the model's next save.
