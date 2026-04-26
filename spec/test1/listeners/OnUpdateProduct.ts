import {BeforeSaveEventListener, DataEventArgs} from '@themost/data';

class OnUpdateProduct implements BeforeSaveEventListener {
    beforeSave(_event: DataEventArgs, callback: (err?: Error) => void): void {
        return callback();
    }
}

// use a native object to export a listener
const onRemoveProduct = {
    beforeRemove: (_event: DataEventArgs, callback: (err?: Error) => void) => {
        return callback();
    }
}

export {
    OnUpdateProduct,
    onRemoveProduct
}