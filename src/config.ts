export const SECRET_DATABASE_URL = validateEnvVariable('DATABASE_URL');

export const PIPERMAIL_SOURCE = validateEnvVariable('PIPERMAIL_SOURCE');

export const PORT = validateInteger('PORT', 3000);

export const numberOfMessagesToProcessInParallel = validateInteger(
  'PIPERMAIL_PARALLEL',
  1,
);

validateInteger('PIPERMAIL_MONTHS', 0);
export function monthsToProcess() {
  return validateInteger('PIPERMAIL_MONTHS', new Date().getDate() < 5 ? 2 : 1);
}

function validateEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error('You must specify the "' + name + '" environment variable');
  }
  return value;
}
function validateInteger(name: string, defaultValue: number) {
  const value = process.env[name];
  if (value) {
    if (!/^\d+$/.test(value) || value.length > 2) {
      throw new Error('The value for PIPERMAIL_MONTHS is not valid');
    }
    return parseInt(value, 10);
  }
  return defaultValue;
}
