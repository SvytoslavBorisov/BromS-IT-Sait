import "react";

declare module "react" {
  interface StyleHTMLAttributes<T> {
    jsx?: boolean | string;
    global?: boolean;
  }
}