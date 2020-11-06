import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as efs from '@aws-cdk/aws-efs';
import * as rfdk from 'aws-rfdk';
import * as path from 'path';

// A simple CloudFormation stack that creates a bare-bones infrastructure with
// AWS Thinkbox Deadline installed, configured, and ready to perform renders.
export class RenderfarmStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // A Virutal Private Cloud (VPC) is a logically isolated section of the
    // AWS Cloud. To deploy a VPC, you create an instance of the CDK's Vpc
    // that uses two availability zones (AZs).
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // To be able to deploy Deadline's RenderQueue you will need to locally
    // build the environment that is required for it by the Amazon Elastic
    // Container Service (ECS). To construct this environment you first run
    // a script that we provide locally to stage the required build-recipe
    // for your desired version of Deadline. Then, in your application, you
    // create an instance of the RFDK's ThinkboxDockerRecipes that references
    // those staged files.
    const stageDir = path.join(__dirname, '..', 'stage');
    const localRecipeStage = rfdk.deadline.Stage.fromDirectory(stageDir);
    const serverRecipes = new rfdk.deadline.ThinkboxDockerRecipes(this, 'ServerImages', {
      stage: localRecipeStage,
    });

    // To operate Deadline you will need a backing-store for Deadline files
    // and scheduling data. You create one by creating an instance of the
    // RFDK's Repository. This will deploy an Amazon DocumentDB and
    // AWS Elastic File System (EFS), in private subnets, and run the
    // Deadline Repository installer to initialize them both.
    const repository = new rfdk.deadline.Repository(this, 'Repository', {
      vpc: vpc,
      version: serverRecipes.version,
      // Allow resources to be deleted when we delete the sample
      removalPolicy: {
        database: cdk.RemovalPolicy.DESTROY,
        filesystem: cdk.RemovalPolicy.DESTROY
      },
    });

    // To create the server to which all Deadline client applications (like
    // the Worker or artist's Monitor) connect you create an instance
    // of the RFDK's RenderQueue. This will create an Amazon ECS, running
    // the Deadline Remote Connection Server (RCS), running behind behind
    // an Application Load Balancer. All Deadline client connections
    // are made with this load balancer.
    const renderQueue = new rfdk.deadline.RenderQueue(this, 'RenderQueue', {
      vpc: vpc,
      version: serverRecipes.version,
      images: serverRecipes.renderQueueImages,
      repository: repository,
      // Allow the load-balancer to be deleted when we delete the sample
      deletionProtection: false,
    });

    // To create a collection of Workers you create an instance of the
    // RFDK's WorkerInstanceFleet. This creates an AWS Auto Scaling Group,
    // in the VPC's private subnets, of EC2-Spot instances that are running
    // the Deadline Client.
    // Note: You must currently set the fleet's desired capacity manually.
    // Note2: You can create as many instances of WorkerInstanceFleet as you like.
    const workers = new rfdk.deadline.WorkerInstanceFleet(this, 'Workers', {
      vpc: vpc,
      renderQueue: renderQueue,
      workerMachineImage: ec2.MachineImage.genericWindows({
        // Fill in your AMI id here
        // [cdk.Stack.of(this).region]: 'ami-01b863f0f8fcaa97a',
        [cdk.Stack.of(this).region]: 'ami-0e6164f420a0898bf',
      }),
      minCapacity: 0,
      instanceType: new ec2.InstanceType('g4dn.xlarge'),
      spotPrice: 0.5000,
    });

    // You can create a filesystem to hold your render assets for the
    // workers in many ways. Here, to create an Amazon Elastic File
    // System (EFS) you create an instance of the CDK's FileSystem.
    const assetFilesystem = new efs.FileSystem(this, 'RenderAssets', {
      vpc: vpc,
      encrypted: true,
      // Allow filesystem to be deleted when we delete the sample
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Finally, you mount that asset filesystem onto your Linux Workers
    // when they are launched by using the RFDK's MountableEfs helper-class.
    const mountableEfs = new rfdk.MountableEfs(this, {
      filesystem: assetFilesystem,
    });
    //mountableEfs.mountToLinuxInstance(workers.fleet, { location: '/mnt/assets' })
    const bucket = new s3.Bucket(this, 'rfdkBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: {
          blockPublicAcls: true,
          blockPublicPolicy: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true,
      },
      publicReadAccess: false,
    });
    const statement = new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.DENY,
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      principals: [new iam.AnyPrincipal],
    });
    statement.addCondition('Bool', {"aws:SecureTransport": "false"});
    bucket.addToResourcePolicy(statement);

    const artistWorkstation = new ec2.Instance(this, 'ArtistInstance', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      // Create a keypair first to obtain the windows password
      keyName: process.env.AWS_KEYPAIR || undefined,
      instanceType: new ec2.InstanceType('g4dn.xlarge'),
      machineImage: ec2.MachineImage.genericWindows({
        [cdk.Stack.of(this).region]: 'ami-0e6164f420a0898bf',
      }),
    });
    bucket.grantReadWrite(artistWorkstation);

    const securityGroup = new ec2.SecurityGroup(this, 'ArtistSecurityGroup', {vpc: vpc});
    // Use your WAN CIDR for allowed ingress
    const WAN_CIDR = process.env.WAN_CIDR || '127.0.0.1/32'
    securityGroup.connections.allowFrom(ec2.Peer.ipv4(WAN_CIDR), ec2.Port.tcp(3389), 'Allow from artist remote location');
    artistWorkstation.addSecurityGroup(securityGroup);
    renderQueue.connections.allowFrom(securityGroup, new ec2.Port({protocol: ec2.Protocol.ALL, stringRepresentation: '0-65000'}));
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName })
    new cdk.CfnOutput(this, 'ArtistInstanceIP', { value: artistWorkstation.instancePublicIp })

  }
}