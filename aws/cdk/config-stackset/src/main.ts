import {
  AccountPrincipal,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from '@aws-cdk/aws-iam';
import {
  App,
  CfnStackSet,
  Construct,
  Stack,
  StackProps,
} from '@aws-cdk/core';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // set up the special named stack set administration & execution roles
    const stacksetAdminRole = new Role(this, 'configRole', {
      roleName: 'AWSCloudFormationStackSetAdministrationRole',
      assumedBy: new ServicePrincipal('cloudformation.amazonaws.com'),
    });
    stacksetAdminRole.attachInlinePolicy(
      new Policy(this, 'configPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: ['arn:*:iam::*:role/AWSCloudFormationStackSetExecutionRole'],
          }),
        ],
      }),
    );

    const stacksetExecutionRole = new Role(this, 'executionRole', {
      roleName: 'AWSCloudFormationStackSetExecutionRole',
      assumedBy: new AccountPrincipal(this.account),
    });
    stacksetExecutionRole.attachInlinePolicy(
      new Policy(this, 'executionPolicy', {
        statements: [
          new PolicyStatement({
            actions: [
              'cloudformation:*',
              's3:*',
              'sns:*',
            ],
            resources: [
              '*',
            ],
          }),
        ],
      }),
    );


    const set = new CfnStackSet(this, 'StackSet', {
      stackSetName: 'TopicStackSet',
      permissionModel: 'SELF_MANAGED',
      parameters: [
        { parameterKey: 'loggingRegion', parameterValue: this.region },
      ],
      stackInstancesGroup: [
        {
          // NOTE: the regional STS endpoints must be enabled for every region you
          // want to deploy a stack into.
          regions: [
            'us-west-1',
            'us-west-2',
            'us-east-1',
            'us-east-2',
          ],
          deploymentTargets: {
            accounts: [this.account],
          },
        },
      ],
      templateBody: `
        Parameters:
          loggingRegion:
            Type: String
        Resources:
          Topic:
            Type: AWS::SNS::Topic
            Properties:
              TopicName: !Sub events-to-\${loggingRegion}
      `,
    });

    set.node.addDependency(stacksetAdminRole);
    set.node.addDependency(stacksetExecutionRole);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'kindlyops-stackset-demo-dev', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
