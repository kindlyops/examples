import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Mediaproduction from '../lib/mediaproduction-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Mediaproduction.MediaproductionStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
