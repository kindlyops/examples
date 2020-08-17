#!/bin/bash

_instance_port=5901
_instance_id="${1}"

aws ssm start-session --target "${_instance_id}" \
  --document-name AWS-StartPortForwardingSession \
  --parameters "{\"portNumber\":[\"${_instance_port}\"],\"localPortNumber\":[\"3001\"]}"