import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { EC2Stack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new EC2Stack(app, 'test');

  expect(stack).not.toHaveResource('AWS::EC2::Instance');
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});