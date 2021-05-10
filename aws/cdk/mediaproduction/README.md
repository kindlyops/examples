# CDK Media Production

This project is an example of simplifying the configuration of a cloud based media production.

The stack will deploy the following:

- [ ] 1 Mixer instance on Windows Server 2019 running OBS and Parsec
- [ ] 4 Input/Zoom instances that send NDI feeds to the Mixer instance
- [ ] 1 VPC including with 1 subnet and placement group
- [ ] 1 Transit Gateway to allow mDNS

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
