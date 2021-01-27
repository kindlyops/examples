import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as cert from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';

interface AmiObj {
  schema_version: number;
  image_name: string;
  image_id: string;
  os: string;
  ecs_runtime_version: string;
  ecs_agent_version: string
}

export class EcsWebAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if(!process.env.EXISTING_CERTIFICATE_ARN) {
      console.error('No ARN set for the cert to use!');
      return process.exit(1)
    }
    if(!process.env.EXISTING_DOMAIN) {
      console.error('No DOMAIN set for the app to use!');
      return process.exit(1)
    }
    if(!process.env.EXISTING_HOSTED_ZONE) {
      console.error('No HOSTED ZONE set for the app to use!');
      return process.exit(1)
    }

    const domainZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ExistingZone', {
      hostedZoneId: process.env.EXISTING_HOSTED_ZONE,
      zoneName: process.env.EXISTING_DOMAIN
    });

    const existingCert = cert.Certificate.fromCertificateArn(this, 'ExistingCert', process.env.EXISTING_CERTIFICATE_ARN);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Ingress",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 24,
          name: "Database",
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    });

    const amiName = ssm.StringParameter.valueFromLookup(this,
       '/aws/service/ecs/optimized-ami/amazon-linux-2/arm64/recommended/image_name'
    );

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const ami = ec2.MachineImage.lookup(
      {
        name: amiName
      }
    );

    cluster.addCapacity('ASG', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO
      ),
      machineImage: ami,
      desiredCapacity: 1,
      maxCapacity: 2,
      associatePublicIpAddress: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const ec2Service = new ecsPatterns.ApplicationLoadBalancedEc2Service(this, 'Service', {
      cluster: cluster,
      certificate: existingCert,
      domainZone: domainZone,
      domainName: `arm-sample-ecs-app.${process.env.EXISTING_DOMAIN}`,
      memoryLimitMiB: 256,
      memoryReservationMiB: 128,
      cpu: 128,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      },
    });
    ec2Service.cluster.hasEc2Capacity
    // Configure auto scaling
    const scalableTarget = ec2Service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 1,
    });

    scalableTarget.scaleOnCpuUtilization('ScaleOnCPU', {
      targetUtilizationPercent: 50,
    });
    scalableTarget.scaleOnMemoryUtilization('ScaleOnMem', {
      targetUtilizationPercent: 50,
    });

  }
}
