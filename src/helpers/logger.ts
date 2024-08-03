// logger is the default logger
export const logger: Logger = console;

export type Logger = {
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  debug: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  info: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  warn: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  error: Function;
};
