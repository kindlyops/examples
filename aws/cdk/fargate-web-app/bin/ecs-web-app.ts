#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EcsWebAppStack } from '../lib/ecs-web-app-stack';

const app = new cdk.App();
new EcsWebAppStack(app, 'EcsWebAppStack');
