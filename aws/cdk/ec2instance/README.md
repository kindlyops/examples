# WOW EC2

Sometimes you need an oldschool EC2 instance with specific permissions for a
temporary task. Save some time and use CDK!

## connecting to the instance with SSM

```bash
aws cloudformation list-exports
# note instance ID
aws ssm start-session --target "${_instance}"
```

## silly ssh stuff

To connect with SSM after provisioning the stack:

```bash
# Create temp key
echo -e 'y\n' | ssh-keygen -t rsa -f /tmp/temp_ssh -N '' >/dev/null 2>&1

aws cloudformation list-exports # note instance ID
export _instance=<instanceID>

# get the AZ
_az=$(aws --output=text ec2 describe-instances --instance-ids ${_instance} \
--query "Reservations[0].Instances[0].Placement.AvailabilityZone")

# Send the temp public key to the instance
aws ec2-instance-connect send-ssh-public-key \
  --instance-id "${_instance}" \
  --availability-zone "${_az}" \
  --instance-os-user "ec2-user" \
  --ssh-public-key file:///tmp/temp_ssh.pub --output json

# add your github ssh key to ssh-agent

# connect over ssh using ssm session as proxy, forwarding ssh credentials to access github
ssh -i /tmp/temp_ssh \
  -o "UserKnownHostsFile=/dev/null" \
  -o "StrictHostKeyChecking=no" \
  -o "ForwardAgent=yes" \
  -o ProxyCommand="aws ssm start-session --target %h --document AWS-StartSSHSession --parameters portNumber=%p --region=us-west-2" \
  "ec2-user@${_instance}"
```
