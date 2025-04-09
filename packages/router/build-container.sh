#!/usr/bin/env bash
container=`buildah from docker.io/node:22-slim`
# Set the working directory
buildah config --workingdir /app $container
buildah copy $container bundle.cjs
buildah config --workingdir /app/config $container
buildah config --cmd ../bundle.cjs $container
buildah commit $container multiapp-router
