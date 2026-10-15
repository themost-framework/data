---
index: 600
title: Define event listeners
summary: Learn how to attach custom handlers to data model events, load their modules, and implement the callback-based listener contract.
category: Data models
readingTime: 6 minutes
---

# Define event listeners

`@themost/data` lets a model declare event listeners in its JSON definition. A listener is a module that exports an object or class with one or more supported event-handler methods. The model registers those methods for the applicable save, remove, query-execution, or upgrade events.

## Configure a listener on a model

Add an `eventListeners` array to the model definition. Each entry requires `type`, a module reference; `name` is an optional descriptive label.

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "name": "Product",
  "title": "Products",
  "version": "1.0",
  "fields": [
    { "name": "id", "type": "Counter", "primary": true },
    { "name": "name", "type": "Text" }
  ],
  "eventListeners": [
    {
      "name": "Normalize product names",
      "type": "./listeners/product-listener"
    }
  ]
}
```

The `type` value identifies a module path. A path may be relative to the application's execution folder or refer to a module in a package. The module should export a listener object whose properties are the event-handler functions.

For the example above, `listeners/product-listener.js` can export a `beforeSave` function as part of the listener object:

```js
module.exports = {
  beforeSave(event, callback) {
    if (typeof event.target.name === "string") {
      event.target.name = event.target.name.trim();
    }
    callback();
  }
};
```

Keep the module path valid for the application's module loader; it is not automatically resolved relative to the model JSON file.

## Supported event methods

Implement only the methods your listener needs. The recognized method names are:

| Method | Called for |
| --- | --- |
| `beforeSave` | Before a model object is saved, whether inserted or updated. |
| `afterSave` | After a model object is saved. |
| `beforeRemove` | Before a model object is removed. |
| `afterRemove` | After a model object is removed. |
| `beforeExecute` | Before a model query is executed. |
| `afterExecute` | After a model query is executed. |
| `beforeUpgrade` | Before the model's upgrade operation. |
| `afterUpgrade` | After the model's upgrade operation. |

Each handler follows the callback contract:

```js
function handler(event, callback) {
  // Handle the event.
  callback();
}
```

`event` is a `DataEventArgs` object. Its available properties include `model`, `target`, `state`, `emitter`, `query`, `previous`, and `result`; which properties are meaningful depends on the event. `callback` accepts an optional `Error`. Call it when the handler has finished, and pass an error when the operation should fail. If a handler performs asynchronous work, call the callback only after that work completes, and ensure it is called once.

## How listeners run

The model registers the custom methods when its context is set. Methods are attached to the model's corresponding event pipeline; a listener that does not implement a method is simply not registered for that event. Save, remove, and execute handlers are associated with their respective before/after events, while upgrade handlers are associated with `before.upgrade` and `after.upgrade`.

These are callback-based event handlers, not promise-returning hooks: finish work by invoking the supplied callback. A before-handler can inspect or change the event data before the operation proceeds; for example, `beforeSave` can normalize a value on `event.target`. An error passed to the callback is propagated through the operation's callback flow. After-handlers run after their corresponding operation, and can likewise report an error through the callback.

The model may register more than one listener. Avoid depending on undocumented ordering relative to framework-provided handlers; keep each custom handler focused, and report asynchronous failures through its callback rather than allowing an unhandled rejection or exception.

## Summary

Define model listeners with an `eventListeners` array whose entries provide a module `type` and may include a display `name`. Export an object containing the event-handler functions you need, using the `(event, callback)` signature. Complete asynchronous work before calling the callback, and pass errors back through it. Check the module path against your application's module-loader configuration and keep handlers limited to behavior needed at that event boundary.
