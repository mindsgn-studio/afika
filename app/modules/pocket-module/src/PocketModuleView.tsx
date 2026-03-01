import { requireNativeView } from 'expo';
import * as React from 'react';

import { PocketModuleViewProps } from './PocketModule.types';

const NativeView: React.ComponentType<PocketModuleViewProps> =
  requireNativeView('PocketModule');

export default function PocketModuleView(props: PocketModuleViewProps) {
  return <NativeView {...props} />;
}
