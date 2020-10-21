import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import * as Mediaproduction from '../lib/mediaproduction-stack';
import * as cr from '@aws-cdk/custom-resources';

test('creates vpc', () => {
  const app = new cdk.App();
  const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
  expect(stack).toHaveResource('AWS::EC2::VPC',{
    CidrBlock: '10.10.0.0/16',
  });
});


test('creates transit gateway with multicast', () => {
  const app = new cdk.App();
  const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
  expect(stack).toHaveResource('AWS::EC2::TransitGateway',{
    MulticastSupport: 'enable',
  });
});

test('creates placement group', () => {
  const app = new cdk.App();
  const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
  expect(stack).toHaveResource('AWS::EC2::PlacementGroup',{
    Strategy: 'cluster',
  });
});

test('creates custom resource', () => {
  const app = new cdk.App();
  const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
  expect(stack).toHaveResource('Custom::AWS');
});

test('get domain output', () => {
  // GIVEN
    const app = new cdk.App();
    const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
    expect(stack).toHaveOutput({
      outputName: 'domainId',
  });
});


test('get network interface 1 output', () => {
  // GIVEN
    const app = new cdk.App();
    const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
    expect(stack).toHaveOutput({
      outputName: 'networkInterface1',
  });
});
