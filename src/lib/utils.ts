import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 兼容旧导入路径：逐步迁移到 lib/formatting
export { formatNumber } from "./formatting";
