import { DataEventArgs } from "@themost/data";

function beforeUpgrade(event: DataEventArgs, callback: (err?: Error) => void) {
    return callback();
}

export {
    beforeUpgrade
}