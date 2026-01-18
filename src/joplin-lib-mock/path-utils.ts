/* eslint no-useless-escape: 0*/

// Simple translation function for path-utils
const _ = (str: string) => str;

let friendlySafeFilename_blackListChars = "/\n\r<>:'\"\\|?*#";
for (let i = 0; i < 32; i++) {
  friendlySafeFilename_blackListChars += String.fromCharCode(i);
}

const friendlySafeFilename_blackListNames = [
  ".",
  "..",
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
];

export function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

export function basename(path: string, ext?: string): string {
  const parts = path.split("/");
  let base = parts[parts.length - 1];
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }
  return base;
}

export function filename(
  path: string,
  includeExtension: boolean = true,
): string {
  if (includeExtension) {
    return basename(path);
  } else {
    const base = basename(path);
    const ext = fileExtension(base);
    if (ext) {
      return base.slice(0, -ext.length - 1);
    }
    return base;
  }
}

export function fileExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function safeFileExtension(ext: string): string {
  // Simple mock - just return the extension
  return ext;
}

export function ltrimSlashes(path: string): string {
  return path.replace(/^\/+/, "");
}

export function rtrimSlashes(path: string): string {
  return path.replace(/\/+$/, "");
}

export function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

export function toSystemSlashes(path: string): string {
  return path.replace(/\//g, "/"); // Keep as forward slashes for mock
}

export function toForwardSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

export function quotePath(path: string): string {
  return `"${path}"`;
}

export function unquotePath(path: string): string {
  return path.replace(/^["']|["']$/g, "");
}

export function friendlySafeFilename(
  e: string,
  maxLength: number = null,
  preserveExtension = false,
) {
  if (maxLength === null) maxLength = 50;
  if (!e || !e.replace) return _("Untitled");

  let fileExt = "";

  if (preserveExtension) {
    const baseExt = fileExtension(e);
    fileExt = baseExt ? `.${safeFileExtension(baseExt)}` : "";
    e = filename(e);
  }

  let output = "";
  for (let i = 0; i < e.length; i++) {
    const c = e[i];
    if (friendlySafeFilename_blackListChars.indexOf(c) >= 0) {
      output += "_";
    } else {
      output += c;
    }
  }

  if (output.length <= 4) {
    if (
      friendlySafeFilename_blackListNames.indexOf(output.toUpperCase()) >= 0
    ) {
      output = "___";
    }
  }

  while (output.length) {
    const c = output[output.length - 1];
    if (c === " " || c === ".") {
      output = output.substr(0, output.length - 1);
    } else {
      break;
    }
  }

  while (output.length) {
    const c = output[0];
    if (c === " ") {
      output = output.substr(1, output.length - 1);
    } else {
      break;
    }
  }

  if (!output) return _("Untitled") + fileExt;

  return output.substr(0, maxLength) + fileExt;
}
