const { AwsCdkTypeScriptApp } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.129.0',
  defaultReleaseBranch: 'main',
  name: 'apigwdiscordbot',

  cdkDependencies: [
    '@aws-cdk/aws-apigateway',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-lambda-nodejs',
    '@aws-cdk/aws-secretsmanager',
  ], /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
  deps: [
    'axios',
    'aws-lambda',
    'discord-bot-cdk-construct',
  ], /* Runtime dependencies of this module. */
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                 /* Build dependencies for this module. */
  // packageName: undefined,      /* The "name" in package.json. */
  // release: undefined,          /* Add release management to this project. */
});
project.synth();
