import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import * as fs from 'fs';

import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';


export class EC2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    const blockDevices = [
        {
            deviceName: '/dev/xvda',
            volume: ec2.BlockDeviceVolume.ebs(2048, {
                volumeType: ec2.EbsDeviceVolumeType.GP2,
                encrypted: true,
            }),
        },
    ];

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        description: `EC2 worker security group`,
        vpc: vpc,
    });
    // if you need connections to specific resources, add them here
    // securityGroup.connections.allowTo(props.databases.FOO, ec2.Port.tcp(5432));

    const instance = new ec2.Instance(this, 'Instance', {
        instanceName: 'ALOHA',
        vpc: vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE24),
        machineImage: ec2.MachineImage.latestAmazonLinux({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        }),
        userData: ec2.UserData.custom(fs.readFileSync('src/cloud-init.sh', 'utf-8')),
        blockDevices: blockDevices,
        securityGroup: securityGroup,
        vpcSubnets: {
            subnetType: ec2.SubnetType.PUBLIC,
        },
    });

    new cdk.CfnOutput(this, 'KindlyExampleInstanceId', { value: instance.instanceId });

    instance.role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new EC2Stack(app, 'ec2-stack-dev', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();