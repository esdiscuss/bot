export function subjectToTopicKey(subject: string): string {
  return subject
    .replace(/[^a-z]+/gi, '')
    .replace(/fwd?/gi, '')
    .replace(/re/gi, '')
    .toLowerCase();
}
export const subjectToTopicSlug: (str: string) => string = require('slugg');
