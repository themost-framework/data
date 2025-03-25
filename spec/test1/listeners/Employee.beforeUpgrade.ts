import { DataEventArgs } from "../../../types";

function beforeUpgrade(event: DataEventArgs, callback: (err?: Error) => void) {
  return callback();
}

export {
    beforeUpgrade
}