import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

        const _ = new AwsCustomResource(this, 'AccountPasswordPolicy', {
            onUpdate: {
                // will also be called for a CREATE event
                service: 'IAM',
                action: 'updateAccountPasswordPolicy',
                parameters: {
                    AllowUsersToChangePassword: true,
                    HardExpiry: false,
                    MaxPasswordAge: 90,
                    MinimumPasswordLength: 18,
                    PasswordReusePrevention: 23,
                    RequireLowercaseCharacters: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                    RequireUppercaseCharacters: true,
                },
                physicalResourceId: PhysicalResourceId.of('AccountPasswordPolicy'),
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
  }
}
