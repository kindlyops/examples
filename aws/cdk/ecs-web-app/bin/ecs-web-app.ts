#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EcsWebAppStack } from '../lib/ecs-web-app-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

new EcsWebAppStack(app, 'EcsWebAppStack', {env});
