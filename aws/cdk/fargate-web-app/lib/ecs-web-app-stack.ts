import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as cert from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import { exitCode } from 'process';


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

    const fargate = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      certificate: existingCert,
      domainZone: domainZone,
      domainName: `sample-ecs-app.${process.env.EXISTING_DOMAIN}`,
      memoryLimitMiB: 1024,
      cpu: 512,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      },
    });

    // Configure auto scaling
    const scalableTarget = fargate.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });

    scalableTarget.scaleOnCpuUtilization('ScaleOnCPU', {
      targetUtilizationPercent: 50,
    });
    scalableTarget.scaleOnMemoryUtilization('ScaleOnMem', {
      targetUtilizationPercent: 50,
    });

  }
}
