import * as React from 'react';

import { PocketModuleViewProps } from './PocketModule.types';

export default function PocketModuleView(props: PocketModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
