import { NativeModule, requireNativeModule } from 'expo';

import { PocketModuleEvents } from './PocketModule.types';

declare class PocketModule extends NativeModule<PocketModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PocketModule>('PocketModule');
