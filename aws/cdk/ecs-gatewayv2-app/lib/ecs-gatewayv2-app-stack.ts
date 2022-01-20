import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as servicediscovery from '@aws-cdk/aws-servicediscovery';
import * as ssm from '@aws-cdk/aws-ssm';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import * as cert from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as path from 'path';
import * as integration from '@aws-cdk/aws-apigatewayv2-integrations';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';

export class EcsGatewayv2AppStack extends cdk.Stack {
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

    const cluster = new ecs.Cluster(this, 'Cluster',
    {
      vpc: vpc,
    });
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

    // cdk does not yet provide a way to specify the equivalent of
    // docker buildx --platform linux/arm64
    // or manually creating manifests. However, this is running on graviton2
    // despite the build warnings.
    const asset = new DockerImageAsset(this, 'KindlyNodejsDemo', {
      directory: path.join(__dirname, '../nodejs-sample'),
      buildArgs: {
        ARCH: 'arm64v8/',
      }
    });


    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
      name: `sample-ecs-apigw-app.${process.env.EXISTING_DOMAIN}`,
      vpc,
    });

    const serviceD = namespace.createService('ServiceDiscovery',{
      dnsRecordType: servicediscovery.DnsRecordType.A,
      dnsTtl: cdk.Duration.seconds(30),
    });
    const vpcLink = new apigatewayv2.VpcLink(this, 'VpcLink', { vpc });

   // const apiIntegration = new integration.HttpServiceDiscoveryIntegration(
   //   {
   //     vpcLink: vpcLink,
   //     service: serviceDiscovery
   //   }
   // );

    const taskDefinition = new ecs.Ec2TaskDefinition(this ,'TaskDefinition', {
      networkMode: ecs.NetworkMode.AWS_VPC,
    });

    const containerDefinition = new ecs.ContainerDefinition(this, 'Container' , {
      image: ecs.ContainerImage.fromDockerImageAsset(asset),
      taskDefinition: taskDefinition,
      memoryLimitMiB: 256,
      memoryReservationMiB: 128,
      cpu: 128,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'example-apigw-ecs'
      })
    });
    containerDefinition.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: ecs.Protocol.TCP
    });
    const service = new ecs.Ec2Service(this, 'Service', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
      cloudMapOptions: {
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(30),
      }
    });
    if(service.cloudMapService){
      const httpEndpoint = new apigatewayv2.HttpApi(this, 'HttpApi', {
        defaultIntegration: new integration.HttpServiceDiscoveryIntegration({
          vpcLink: vpcLink,
          service: serviceD
        })
      });
    }

  }
}
