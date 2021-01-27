# Example ECS Web App with HTTPS running on ARM

This project will deploy a sample web application running on an ECS cluster complete with an application load balancer and auto scaling.

## Prerequisites

- Route53 Hosted Zone.
- Certificate ARN for the domain you would like to use.
- This deployment will create `https://arm-sample-ecs-app.YOURDOMAINHERE.com`

This will require the following environment variables to be exported:

    export EXISTING_DOMAIN='yourdomaingoeshere.com'
    export EXISTING_CERTIFICATE_ARN='your:cert:arn'
    export EXISTING_HOSTED_ZONE='YOURXYZZONEID'

## Build and Deploy

    npm i
    npm run build
    cdk deploy
