// Mock for next/image (used in components)
import React from 'react';

export default React.forwardRef(function MockImage(props: any, ref: any) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return React.createElement('img', { ref, ...props });
});
