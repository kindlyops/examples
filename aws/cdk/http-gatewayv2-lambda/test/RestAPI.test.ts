import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as RestAPI from '../lib/RestAPI';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new RestAPI.RestAPI(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
