// Text messages (sign-in codes). A driver sends one message; failures are logged and swallowed, so a provider outage
// shows up in the logs rather than as a crash. Today only 'log' exists (the message goes to the server log).
//
// Adding a provider: write a driver `(to, text) => Promise<void>` that calls its HTTP API (credentials from env vars),
// add it to createSms below under a new SMS_DRIVER name, and list its settings in api/.env.example.

export type SmsSender = (to: string, text: string) => Promise<void>;
export type SmsDriver = 'log';
export const SMS_DRIVERS: SmsDriver[] = ['log'];

/** The SMS sender for a driver name (SMS_DRIVER). Unknown names are refused at start-up. */
export function createSms(driver: string = 'log'): SmsSender {
  if (driver !== 'log') throw new Error(`SMS_DRIVER=${driver} is not available (have: ${SMS_DRIVERS.join(', ')})`);
  return async (to, text) => { console.log(`[sms] (log only) to ${to}: ${text}`); };
}
