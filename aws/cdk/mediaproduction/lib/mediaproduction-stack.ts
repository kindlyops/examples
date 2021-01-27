import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as imageBuilder from '@aws-cdk/aws-imagebuilder';
import * as cr from '@aws-cdk/custom-resources';
import { Reference } from '@aws-cdk/core';

import { readFileSync } from 'fs';
import { join } from 'path'

interface transitGatewayInfo {tgId: string, attachmentId: string};

export class MediaproductionStack extends cdk.Stack {
  private vpc: ec2.Vpc;
  private ami: string;
  private domain: cdk.CustomResource;
  private tgId: transitGatewayInfo;
  private instanceType: string;
  private placement: ec2.CfnPlacementGroup;
  private domainId: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.instanceType = 'g4dn.xlarge';
    this.vpc = this.createVPC();
    this.ami = 'ami-0fd3ed1f806024eca';
    this.placement = this.createPlacementGroup();


    this.tgId = this.createTransitGateway();
    this.domain = this.createTransitGatewayDomain(this.tgId);
    this.createInputs(1);
    // Create Image Builder Pipeline for creating Windows NICE instances

    // First create a new component to install Chocolatey
    const installChocolatey = new imageBuilder.CfnComponent(this, 'Install Build Tools', {
      name: 'Install Chocolatey',
      platform: 'Windows',
      version: '1.0.0',
      data: readFileSync(
        join(__dirname, '../imageBuilderComponents/installChocolatey.yaml'),
      ).toString(),
    });

    // Then create an Image Recipe using NICE as the base image

    const niceWindowsRecipe = new imageBuilder.CfnImageRecipe(this, 'WindowsNICEBaseAMIRecipe', {
      name: 'Windows NICE Base AMI Recipe',
      version: '1.0.0',
      components: [{ componentArn: installChocolatey.attrArn,},],
      parentImage: new ec2.LookupMachineImage({
        name: 'DCV-Server2019-2020-0-8428-NVIDIA-442-49-g4 *', owners: ['amazon']
      }).getImage(this).imageId,
    });

    // Next create the role for the builder
    const builderRole = new iam.Role(this, 'WindowsBuilderRole', {
      roleName: 'WindowsBuilderRole',
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    builderRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    );
    builderRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'EC2InstanceProfileForImageBuilder',
      ),
    );

    // Create a new instance profile and attach the role
    const builderInstanceProfile = new iam.CfnInstanceProfile(this,'BuilderInstanceProfile', {
        instanceProfileName: 'BuilderInstanceProfile',
        roles: [builderRole.roleName],
    });

    // Create security group for the image builder pipeline
    const builderSecurityGroup = new ec2.SecurityGroup(this, 'BuilderSecurityGroup', {
      vpc: this.vpc,
    });
    // Create infra configuration
    const imageBuilderInfraConfig = new imageBuilder.CfnInfrastructureConfiguration(this,'WindowsImageBuilder', {
        name: 'Windows Image Builder',
        instanceTypes: ['t3.large'],
        instanceProfileName: builderInstanceProfile.instanceProfileName!,
        subnetId: this.vpc.selectSubnets().subnetIds[0],
        securityGroupIds: [builderSecurityGroup.securityGroupId]
    });

    const imageBuilderPipeline = new imageBuilder.CfnImagePipeline(this, 'WindowsNICEImage', {
      name: 'Windows NICE Image Pipeline',
      imageRecipeArn: niceWindowsRecipe.attrArn,
      infrastructureConfigurationArn: imageBuilderInfraConfig.attrArn,
    });

  };


  private createVPC(): ec2.Vpc {
    return new ec2.Vpc(this, 'mediaVPC', {
      // 'cidr' configures the IP range and size of the entire VPC.
      // The IP space will be divided over the configured subnets.
      cidr: '10.10.0.0/16',

      // 'maxAzs' configures the maximum number of availability zones to use
      maxAzs: 1,

      // 'subnetConfiguration' specifies the "subnet groups" to create.
      // Every subnet group will have a subnet for each AZ, so this
      // configuration will create `3 groups × 3 AZs = 9` subnets.
      subnetConfiguration: [
        {
          // 'subnetType' controls Internet access, as described above.
          subnetType: ec2.SubnetType.PUBLIC,

          // 'name' is used to name this particular subnet group. You will have to
          // use the name for subnet selection if you have more than one subnet
          // group of the same type.
          name: 'MediaInstances',

          // 'cidrMask' specifies the IP addresses in the range of of individual
          // subnets in the group. Each of the subnets in this group will contain
          // `2^(32 address bits - 24 subnet bits) - 2 reserved addresses = 254`
          // usable IP addresses.
          //
          // If 'cidrMask' is left out the available address space is evenly
          // divided across the remaining subnet groups.
          cidrMask: 24,
        }
      ],
    });
  };

  private createInputs(total: number) {
    // Using ec2.CfnInstance since ec2.Instance does not supply placement group options
    for (let i = 1; i<=total; i++) {
      const instance = new ec2.CfnInstance(this,`Input${i}`, {
        subnetId: this.vpc.selectSubnets().subnetIds[0],
        instanceType: this.instanceType,
        imageId: this.ami,
        placementGroupName: this.placement.ref
      });
      this.registerSource(instance, i);
    }
  };

  private createPlacementGroup(){
    return new ec2.CfnPlacementGroup(this, 'mediaPlacementGroup',{strategy: 'cluster'});
  };

  private createTransitGateway(): {tgId: string, attachmentId: string} {
    const tg =  new ec2.CfnTransitGateway(this, 'mediaTransitGateway',{
      description: 'TG to allow mDNS',
      multicastSupport: 'enable',
      dnsSupport: 'enable',
    });

    const attachment = new ec2.CfnTransitGatewayAttachment(this,'mediaTransitGatewayAttachment',{
      vpcId: this.vpc.vpcId,
      transitGatewayId: tg.ref,
      subnetIds: this.vpc.selectSubnets().subnetIds,
    });

    return {tgId: tg.ref, attachmentId: attachment.ref}
  };

  private createTransitGatewayDomain(tgInfo: transitGatewayInfo) {

    // defines an AWS Lambda resource
    const gatewayOnEvent = new lambda.Function(this, 'onEventHanlder', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customSDKLambda.transitGatewayOnEvent',
    });
    const gatewayIsComplete = new lambda.Function(this, 'isCompleteHanlder', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customSDKLambda.transitGatewayIsComplete'
    });

    const provider = new cr.Provider(this, 'TransitGatewayProvider',{
      onEventHandler: gatewayOnEvent,
      isCompleteHandler: gatewayIsComplete,
    });

    const domainResource = new cdk.CustomResource(this, 'GatewayDomainResource', {
      serviceToken: provider.serviceToken,
      properties: {
        TransitGatewayId: tgInfo.tgId,
        PhysicalResourceId: 'GatewayDomainResource'
      }
    });
    domainResource.node.addDependency(provider);
    this.domainId = domainResource.getAtt('DomainId').toString();
  
   /* const createTGDomain = new cr.AwsCustomResource(this, 'CreateDomain', {
      onUpdate: { // will also be called for a CREATE event
        service: 'EC2',
        action: 'createTransitGatewayMulticastDomain',
        parameters: {
          TransitGatewayId: tgInfo.tgId
        },
        physicalResourceId: cr.PhysicalResourceId.of('multicastDomain')
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });
    this.domainId = createTGDomain.getResponseField('TransitGatewayMulticastDomain.TransitGatewayMulticastDomainId');
    */
    const domainAssoc = new cr.AwsCustomResource(this, 'CreateAssociation', {
      onUpdate: {
        service: 'EC2',
        action: 'associateTransitGatewayMulticastDomain',
        parameters: {
          SubnetIds: this.vpc.selectSubnets().subnetIds,
          TransitGatewayMulticastDomainId: this.domainId,
          TransitGatewayAttachmentId: tgInfo.attachmentId,
        },
        physicalResourceId: cr.PhysicalResourceId.of('domainAssociation')
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });
    domainAssoc.node.addDependency(domainResource);
    new cdk.CfnOutput(this, 'domainId', { value: this.domainId });

    return domainResource;
  };

  private registerSource(instance: ec2.CfnInstance, num: number) {
    const getNetworkId = new cr.AwsCustomResource(this, `describeInstance${num}`, {
      onUpdate: {
        service: 'EC2',
        action: 'describeNetworkInterfaces',
        parameters: {
          Filters: [
            {
              Name: 'attachment.instance-id',
              Values: [ instance.ref ]
            }
          ],
        },
        outputPath: 'NetworkInterfaces.0.NetworkInterfaceId',
        physicalResourceId: cr.PhysicalResourceId.of(`getNetwork${num}`)
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });

    const networkInterfaceId = getNetworkId.getResponseField('NetworkInterfaces.0.NetworkInterfaceId');
    new cdk.CfnOutput(this, `networkInterface${num}`, { value: networkInterfaceId });

    const source = new cr.AwsCustomResource(this, `sourceRegistration${num}`, {
      onUpdate: {
        service: 'EC2',
        action: 'registerTransitGatewayMulticastGroupSources',
        parameters: {
          TransitGatewayMulticastDomainId: this.domainId,
          GroupIpAddress: '224.0.0.1',
          NetworkInterfaceIds: [networkInterfaceId]
        },
        physicalResourceId: cr.PhysicalResourceId.of(`registerSource${num}`)
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });
    source.node.addDependency(this.domain);
    source.node.addDependency(instance);
    source.node.addDependency(getNetworkId);
  };
}
