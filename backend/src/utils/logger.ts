/**
 * Minimal logger. Deliberately never logs CV contents, emails, phone numbers,
 * or full request bodies — only event names and safe metadata.
 */
type LogMeta = Record<string, string | number | boolean | undefined>;

function format(level: string, event: string, meta?: LogMeta) {
  const base = { level, event, time: new Date().toISOString(), ...meta };
  return JSON.stringify(base);
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    console.log(format("info", event, meta));
  },
  warn(event: string, meta?: LogMeta) {
    console.warn(format("warn", event, meta));
  },
  error(event: string, meta?: LogMeta) {
    console.error(format("error", event, meta));
  },
};
