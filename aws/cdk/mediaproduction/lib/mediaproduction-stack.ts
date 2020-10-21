import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cr from '@aws-cdk/custom-resources';

export class MediaproductionStack extends cdk.Stack {
  private vpc: ec2.Vpc;
  private ami: string;
  private tgId: string;
  private instanceType: string;
  private placement: ec2.CfnPlacementGroup;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.instanceType = 'g4dn.xlarge';
    this.vpc = this.createVPC();
    this.ami = 'ami-0fd3ed1f806024eca';
    this.placement = this.createPlacementGroup();

    this.createInputs(4);
    this.tgId = this.createTransitGateway();
    this.createTransitGatewayDomain(this.tgId);
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
      new ec2.CfnInstance(this,`Input${i}`, {
        subnetId: this.vpc.selectSubnets().subnetIds[0],
        instanceType: this.instanceType,
        imageId: this.ami,
        placementGroupName: this.placement.getAtt.name
      });
    }
  };

  private createPlacementGroup(){
    return new ec2.CfnPlacementGroup(this, 'mediaPlacementGroup',{strategy: 'cluster'});
  };

  private createTransitGateway(): string{
    const tg =  new ec2.CfnTransitGateway(this, 'mediaTransitGateway',{
      description: 'TG to allow mDNS',
      multicastSupport: 'enable',
      dnsSupport: 'enable',
    });

    new ec2.CfnTransitGatewayAttachment(this,'mediaTransitGatewayAttachment',{
      vpcId: this.vpc.vpcId,
      transitGatewayId: tg.ref,
      subnetIds: this.vpc.selectSubnets().subnetIds,
    });

    return tg.ref
  };

  private createTransitGatewayDomain(tgId: string) {
    const createTGDomain = new cr.AwsCustomResource(this, 'CreateDomain', {
      onUpdate: { // will also be called for a CREATE event
        service: 'EC2',
        action: 'createTransitGatewayMulticastDomain',
        parameters: {
          TransitGatewayId: tgId
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()) // Update physical id to always fetch the latest version
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });
    const domainId = createTGDomain.getResponseField('TransitGatewayMulticastDomainId');

    new cr.AwsCustomResource(this, 'CreateAssociation', {
      onUpdate: { // will also be called for a CREATE event
        service: 'EC2',
        action: 'associateTransitGatewayMulticastDomain',
        parameters: {
          SubnetIds: this.vpc.selectSubnets().subnetIds,
          TransitGatewayMulticastDomainId: domainId,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()) // Update physical id to always fetch the latest version
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE})
    });

  };
}
