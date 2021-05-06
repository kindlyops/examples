#!/bin/bash

set -euo pipefail

yum update -y && yum upgrade -y
yum install -y \
  amazon-ecr-credential-helper \
  docker-19.03.13ce-1.amzn2 \
  gcc \
  gcc-c++ \
  git \
  jq \
  patch \
  htop \
  tmux \
  bcc-tools \
  python3

curl -sSL https://bootstrap.pypa.io/get-pip.py | python3
pip3 install --no-cache-dir PyYAML docker-compose

# Configure the docker daemon DNS instead of relying on the default.
mkdir -p /etc/docker
cat << EOF > /etc/docker/docker.json
{
  "dns": ["169.254.169.253"],
}
EOF

# Start and configure docker
service docker start
systemctl enable docker

# add ssm-user and ec2-user to docker group for convenience
usermod -aG docker ssm-user
usermod -aG docker ec2-user