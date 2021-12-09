import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';
import * as cw from '@aws-cdk/aws-cloudwatch';
import { App, Construct, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const lambdaName = `${this.stackName}-ExampleHelloLambda`;
    const logsGroup = new logs.LogGroup(this, 'lambdaLogGroup', {
      logGroupName: `/aws/lambda/${lambdaName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const helloLambda = new lambda.Function(this, 'HelloLambda', {
      code: new lambda.InlineCode(
        "exports.handler = async () => { console.log('hello world'); };",
      ),
      functionName: lambdaName,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    helloLambda.node.addDependency(logsGroup);

    const functionErrors = helloLambda.metricErrors({
      period: cdk.Duration.minutes(1),
    });
    functionErrors.createAlarm(this, 'helloLambdaErrorAlarm', {
      alarmName: `${this.stackName}-helloLambdaErrorAlarm`,
      evaluationPeriods: 1,
      threshold: 1,
      treatMissingData: cw.TreatMissingData.IGNORE,
      comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      });

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'example-lambda-monitoring', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
