#!/bin/bash

# For more info:
# https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html

# Your resource arn goes here
_principal_arn="arn:aws:iam::${AWS_ACCOUNT}:user/audit_user"

# Your resource arn you want to test against goes here
_resource_arn="arn:aws:ec2:*:*:instance/id-someinstance"

# The actions we want to test
_actions=("ec2:StopInstance")

aws iam simulate-principal-policy \
--policy-source-arn \
"${_principal_arn}" \
--action-names "${_actions[@]}" \
--resource-arns "${_resource_arn}" \
--output text