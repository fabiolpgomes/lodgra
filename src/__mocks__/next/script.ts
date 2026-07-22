// Mock for next/script (used for third-party scripts like GA, analytics, etc)
import React from 'react';

export default React.forwardRef(function MockScript(props: any, ref: any) {
  return React.createElement('script', { ref, ...props });
});

export { default as Script };
