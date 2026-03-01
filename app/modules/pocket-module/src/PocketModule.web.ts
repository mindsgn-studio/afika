import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './PocketModule.types';

type PocketModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class PocketModule extends NativeModule<PocketModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(PocketModule, 'PocketModule');
