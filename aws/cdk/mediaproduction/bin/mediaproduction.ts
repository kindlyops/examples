#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MediaproductionStack } from '../lib/mediaproduction-stack';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

new MediaproductionStack(app, 'MediaproductionStack',{env: env});
