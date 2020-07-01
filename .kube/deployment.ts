import createDeployment from './createDeployment';

if (!process.env.DOCKERHUB_USERNAME) {
  console.error('DOCKERHUB_USERNAME must be specified');
  process.exit(1);
}
if (!process.env.CIRCLE_SHA1) {
  console.error('CIRCLE_SHA1 must be specified');
  process.exit(1);
}

export default createDeployment({
  namespace: 'esdiscuss',
  name: 'esdiscuss-bot',
  containerPort: 3000,
  replicaCount: 1,
  image: `${process.env.DOCKERHUB_USERNAME}/esdiscuss-bot:${process.env.CIRCLE_SHA1}`,
});
