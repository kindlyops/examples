#!/bin/bash

# For more info:
# https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html

# The JSON you want to convert to a string
_policy_json='{ "Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "ec2:StopInstance","Resource": "arn:aws:ec2:*:*:instance/id-someinstance"}]}'

# Your resource arn you want to test against goes here
_resource_arn="arn:aws:ec2:*:*:instance/id-someinstance"

# The action we want to test
_actions=("ec2:StopInstance")

aws iam simulate-custom-policy \
--policy-input-list "${_policy_json}" \
--action-names "${_actions[@]}" \
--resource-arns "${_resource_arn}" \
--output text
