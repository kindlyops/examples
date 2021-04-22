import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const logKey = new kms.Key(this, 'LogsKinesisKey', {
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

   new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      logGroupName: '/kindlyops/examples/kms-encrypted-log-group',
      encryptionKey: logKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // grant permissions for cloudwatch to use this KMS key
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html#cmk-permissions
    logKey.grantEncryptDecrypt(new iam.ServicePrincipal(`logs.${Stack.of(this).region}.amazonaws.com`),);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'my-stack-dev', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();