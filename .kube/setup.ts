import createIngress from './createIngress';
import createConfigMap from './createConfigMap';

// reusing service account & namespace from main website
// the bot does not have a staging account
export default [
  ...createIngress({
    name: 'esdiscuss-bot',
    namespace: 'esdiscuss',
    serviceName: 'esdiscuss-bot',
    hosts: ['bot.esdiscuss.org'],
    createCertificate: true,
    enableTLS: true,
    stagingTLS: false,
  }),

  createConfigMap({
    name: 'esdiscuss-bot',
    namespace: 'esdiscuss',
    data: {
      NODE_ENV: 'production',
    },
  }),
];
