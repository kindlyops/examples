import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
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
      workerMachineImage: new ec2.LookupMachineImage({ name: 'Deadline Worker Base Image Linux 2 10.1.9.2 2020-07-20T210441Z'}),
      minCapacity: 1,
      instanceType: new ec2.InstanceType('c5.large'),
      spotPrice: 0.1344,
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
    mountableEfs.mountToLinuxInstance(workers.fleet, { location: '/mnt/assets' })
  }
}