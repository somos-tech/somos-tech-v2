// TypeScript declarations for Givebutter widget custom element
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'givebutter-widget': {
        id: string;
      };
    }
  }
}
