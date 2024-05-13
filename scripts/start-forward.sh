#!/usr/bin/env bash

set -euo pipefail
KORREL8R_NAME=${KORREL8R_NAME:="korrel8r"}
KORREL8R_NAMESPACE=${KORREL8R_NAMESPACE:="korrel8r"}


echo -e "Korrel8r Namespace: \033[33m$KORREL8R_NAMESPACE\033[0m"
echo -e "Korrel8r Name: \033[33m$KORREL8R_NAME\033[0m\n"
echo -e "\033[32mStarting port forwarding\033[0m\n"

oc project $KORREL8R_NAMESPACE

KORREL8R_POD_NAME=$(oc get pods -n $KORREL8R_NAMESPACE --selector=app.kubernetes.io/name=korrel8r,app.kubernetes.io/instance=$KORREL8R_NAME -o jsonpath='{.items[0].metadata.name}')

oc port-forward $KORREL8R_POD_NAME 9005:8443
