---
title: Run automatic model migrations after a version change
summary: Understand how changing a model version is detected, which operations start migration, and how to request an upgrade explicitly.
category: Data models
readingTime: 4 minutes
---

# Run automatic model migrations after a version change

Changing a model's `version` marks its definition as a candidate for migration. It does not run a migration simply because the application loads the model configuration. The change is acted on when the model is next asked to migrate, either through a data operation that invokes migration or through an explicit migration call.

## Set a new model version

Model schemas include a `version` property alongside the model name and fields. Increase it when deploying a model definition that should be reconciled with its data source:

```json
{
  "name": "Product",
  "version": "1.1",
  "source": "Products",
  "fields": [
    { "name": "id", "type": "Counter", "primary": true },
    { "name": "name", "type": "Text" },
    { "name": "sku", "type": "Text" }
  ]
}
```

The migration check compares the model's current `version` with the version recorded for that model in the current configuration's cache. If the values are equal, migration exits without changing the data source. If they differ (including when there is no cached version yet), the framework builds a migration from the model definition and passes it to the configured database adapter.

## Know when the check runs

Migration is checked as part of model operations that save data, including `save()` and the `insert()` and `update()` operations that use the save path. `remove()` also requests migration. Therefore, after a version change, the first such operation can perform the migration before completing the requested data operation.

To migrate at a deliberate point—for example, during application startup or a deployment step—request it directly:

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

The callback-based `migrate(callback)` API is also available. The asynchronous form resolves to a boolean: `true` when the migration is marked updated, and `false` when no update was performed. A model with a base model attempts the base model's migration first.

## Account for migration prerequisites

- The version comparison uses the current configuration cache; changing the schema alone does not initiate a migration. In particular, a matching cached version short-circuits the migration check.
- A sealed model is skipped. An abstract model cannot be migrated as a concrete model and the attempt fails.
- The operation depends on the configured data adapter's migration support. If the migration or a preceding upgrade step fails, the requested operation fails as well.
- Successful migration records the model's current version in the configuration cache. The framework also maintains migration records through its Migration model, but the version-change check itself compares against the configuration cache.
- Upgrade hooks are part of the migration lifecycle, not a separate trigger: `beforeUpgrade` runs before the adapter migration, and `afterUpgrade` may be skipped when the adapter marks the migration updated. See the upgrade-listener guidance for listener registration and lifecycle details.

## Conclusion

Treat a version change as a signal for the next migration attempt, not as an immediate action at configuration load. Let the next save-related operation migrate when that timing is appropriate, or call `migrate()`/`migrateAsync()` explicitly when deployment sequencing requires control. Check the model's migration prerequisites and handle errors before allowing dependent application work to continue.
