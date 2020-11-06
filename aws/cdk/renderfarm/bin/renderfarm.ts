#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RenderfarmStack } from '../lib/renderfarm-stack';
import { openStdin } from 'process';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION ?? process.env.CDK_DEFAULT_REGION,
  };

new RenderfarmStack(app, 'RenderfarmStack', {env});
