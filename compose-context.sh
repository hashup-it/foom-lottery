#!/bin/sh

IS_STAGING=${IS_STAGING:-false}

if [ "$IS_STAGING" = "true" ]; then
  export HOST_PORT=1081
  export CONTAINER_NAME="foom-lottery-staging"
  export COMPOSE_PROJECT_NAME="foom_lottery_staging"
else
  export HOST_PORT=1080
  export CONTAINER_NAME="foom_lottery"
  export COMPOSE_PROJECT_NAME="foom_lottery"
fi
