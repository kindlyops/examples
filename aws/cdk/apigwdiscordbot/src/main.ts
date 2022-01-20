import * as path from 'path';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Duration, Stack, StackProps } from '@aws-cdk/core';
import { DiscordBotConstruct } from 'discord-bot-cdk-construct';


export class SampleDiscordBotStack extends Stack {
  /**
   * The constructor for building the stack.
   * @param {Construct} scope The Construct scope to create the stack in.
   * @param {string} id The ID of the stack to use.
   */
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Create the Commands Lambda.
    const discordCommandsLambda = new NodejsFunction(this, 'discord-commands-lambda', {
      runtime: Runtime.NODEJS_14_X,
      entry: path.join(__dirname, './functions/commands.ts'),
      handler: 'handler',
      timeout: Duration.seconds(60),
    });

    new DiscordBotConstruct(this, 'discord-bot-endpoint', {
      commandsLambdaFunction: discordCommandsLambda,
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new SampleDiscordBotStack(app, 'discord-hello-bot', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
