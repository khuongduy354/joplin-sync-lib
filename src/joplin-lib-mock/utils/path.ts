// Path utilities
import * as path from "path";

/**
 * Check if a file or directory is hidden (starts with a dot)
 */
export function isHidden(filePath: string): boolean {
  const basename = path.basename(filePath);
  return basename.startsWith(".") && basename !== "." && basename !== "..";
}

/**
 * Normalize a file path
 */
export function normalize(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Join path segments
 */
export function join(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get the directory name of a path
 */
export function dirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get the base name of a path
 */
export function basename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

/**
 * Get the extension of a path
 */
export function extname(filePath: string): string {
  return path.extname(filePath);
}
