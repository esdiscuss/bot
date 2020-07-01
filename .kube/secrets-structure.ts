import createSecret from './createSecrets';

// To set secrets:
//   - create `secrets.ts` in this folder
//   - run `jskube .kube/secrets.ts`
//   - delete `secrets.ts`
// The code for `secrets.ts` is in 1password
interface Secrets {
  MONGO_USER: string;
  MONGO_PASS: string;

  DATABASE_URL: string;
}
export default function secrets(production: Secrets) {
  return [
    createSecret({
      name: 'esdiscuss-bot',
      namespace: 'esdiscuss',
      data: production as any,
    }),
  ];
}
