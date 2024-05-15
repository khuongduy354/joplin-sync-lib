export const logger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

export interface LoggerWrapper {
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  debug: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  info: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  warn: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  error: Function;
}
