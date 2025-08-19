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
  title: React.ReactNode;           // ← было string
  className?: string;
  subtitle?: React.ReactNode;       // опционально
}

export function CardHeader({ title, subtitle, className }: CardHeaderProps) {
  return (
    <div className={`border-b pb-2 mb-2 ${className ?? ""}`}>
      {typeof title === "string" ? (
        <h3 className="text-xl font-semibold">{title}</h3>
      ) : (
        // если пришёл сложный JSX, рендерим как есть
        title
      )}
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
export interface CardContentProps {
  children: React.ReactNode;
}

export function CardContent({ children }: CardContentProps) {
  return <div className="text-sm text-gray-700">{children}</div>;
}
