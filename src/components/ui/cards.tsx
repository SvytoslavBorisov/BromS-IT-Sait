import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl shadow p-4 bg-white ${className}`}
      {...props}
    />
  );
}

export interface CardHeaderProps {
  title: string;
}

export function CardHeader({ title }: CardHeaderProps) {
  return (
    <div className="border-b pb-2 mb-2">
      <h3 className="text-xl font-semibold">{title}</h3>
    </div>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
}

export function CardContent({ children }: CardContentProps) {
  return <div className="text-sm text-gray-700">{children}</div>;
}
