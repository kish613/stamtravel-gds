import * as React from 'react';

const Separator = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr className={`border-t border-[#CBD5E1] ${className || ''}`} {...props} />
);

Separator.displayName = 'Separator';
export { Separator };
