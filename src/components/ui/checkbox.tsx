"use client";

import React from "react";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Checkbox({ className = "", ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={
        `h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ` +
        className
      }
      {...props}
    />
  );
}

export default Checkbox;