#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MediaproductionStack } from '../lib/mediaproduction-stack';

const app = new cdk.App();
new MediaproductionStack(app, 'MediaproductionStack');
