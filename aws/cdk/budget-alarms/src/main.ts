import * as budgets from '@aws-cdk/aws-budgets';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new budgets.CfnBudget(this, 'MyCfnBudget', {
      budget: {
        budgetType: 'COST',
        timeUnit: 'DAILY',
        budgetLimit: {
          amount: 100,
          unit: 'USD',
        },
        budgetName: 'daily-spend-budget',
        // costFilters: costFilters, this could be a tag, region, account, or service
        costTypes: {
          includeCredit: false,
          includeDiscount: true,
          includeOtherSubscription: true,
          includeRecurring: true,
          includeRefund: true,
          includeSubscription: false,
          includeSupport: false,
          includeTax: false,
          includeUpfront: false,
          useAmortized: false,
          useBlended: false,
        },
        //plannedBudgetLimits: ,

        // when created, the budget will automatically start at the beginning
        // of the current period
        // timePeriod: {
        //   start: 'start',
        //   end: 'end',
        // },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              address: 'support+budgetexample@kindlyops.com',
              subscriptionType: 'EMAIL',
            },
          ],
        },
      ],
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'budget-example-alarms', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
