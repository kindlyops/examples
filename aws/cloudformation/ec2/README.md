# How To

## Deploy Kali Linux as an EC2 using SSM without SSH

Deploy [pentest.yaml](pentest.yaml) using cloudformation and pass in the needed parameters.

Once the instance is deployed you can start a vnc port forwarding session using ssm:

```bash
_instance_port=5901
_instance_id=id-of-the-instance

aws ssm start-session --target "${_instance_id}" \
  --document-name AWS-StartPortForwardingSession \
  --parameters "{\"portNumber\":[\"${_instance_port}\"],\"localPortNumber\":[\"9000\"]}"
  ```

Then you can fire up your favorite VNC client using `localhost:5901` in this example.
