#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EcsGatewayv2AppStack } from '../lib/ecs-gatewayv2-app-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

new EcsGatewayv2AppStack(app, 'EcsGatewayv2AppStack', {env});
