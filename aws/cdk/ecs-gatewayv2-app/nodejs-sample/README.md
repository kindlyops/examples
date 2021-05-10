# manual multi-arch build

    docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t statik/nodejs-demo:latest --push . 

