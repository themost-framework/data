## The `nested` property

The `nested` property of an attribute is used to define a nested object. For example, a `Product` has a `ProductDimension` object. The `ProductDimension` object is nested in the `Product` object.

```json
{
    "name": "productDimensions",
    "type": "ProductDimension",
    "nested": true,
    "expandable": true,
    "multiplicity": "ZeroOrOne",
    "mapping": {
        "parentModel": "Product",
        "parentField": "id",
        "childModel": "ProductDimension",
        "childField": "product",
        "associationType": "association",
        "cascade": "delete"
    }
}
```

A nested object follows parent object's lifecycle. For example, if the parent object is deleted, the nested object is deleted as well. Of course, a nested will be created when the parent object is created and updated when the parent object is updated.

The `nested` property is used in conjunction with the `mapping` property. The `mapping` property defines the relationship between the parent object and the nested object. The `mapping` property is explained in the next section.

### The `mapping` property

The `mapping` property holds the information about the relationship between the parent object and the nested object. `parentModel` and `childModel` hold the names of the parent and child models respectively. `parentField` and `childField` hold the names of the fields that are used to define the relationship between the parent and child models e.g. `productDimensions` is a nested object of `Product` and data will be stored in the `ProductDimension` model which has a `product` field.

This association described above is a typical one-to-one association. The `associationType` property is set to `association` which means that the `ProductDimension` model will have a `product` field which will hold the id of the `Product` model. The `cascade` property is set to `delete` which means that when a `Product` is deleted, the `ProductDimension` will be deleted as well.

Let's see `ProductDimension` schema:

```json
{
    "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
    "name": "ProductDimension",
    "version": "2.0",
    "inherits": "StructuredValue",
    "fields": [
        {
            "name": "width",
            "type": "Number",
            "nullable": false
        },
        {
            "name": "height",
            "type": "Number",
            "nullable": false
        },
        {
            "name": "product",
            "type": "Product"
        }
    ],
    "constraints": [
        {
            "type": "unique",
            "fields": [
                "product"
            ]
        }
    ]
}
```

The `product` field is defined as a `Product` object. The `constraints` property is used to define a unique constraint for the `product` field. This constraint ensures that a `ProductDimension` can be associated with only one `Product`.

The following code demonstrates how to update a `Product` object with a `ProductDimension` object:

```javascript
const Products = context.model('Product');
const product = await Products.where((x) => {
        return x.name === 'Product 1';
    }).getItem();
// update product
product.productDimensions = {
    height: 0.136,
    width: 0.069
};
await Products.save(product);
```

Checkout [the test project at codesandbox.io](https://codesandbox.io/p/devbox/themost-framework-starter-75ff8q?file=%2Fspec%2FNested.spec.mjs) for more examples about nested objects.



