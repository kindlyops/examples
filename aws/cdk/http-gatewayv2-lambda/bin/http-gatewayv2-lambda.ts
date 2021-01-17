#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RestAPI } from '../lib/RestAPI';

const app = new cdk.App();
new RestAPI(app, 'APIStack');
