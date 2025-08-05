import React from 'react';

type BadgeProps = {
  count: number;
};

export function Badge({ count }: BadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count;

  return (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-sm font-medium bg-red-600 text-white rounded-full">
      {displayCount}
    </span>
  );
}
