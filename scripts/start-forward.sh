#!/usr/bin/env bash

set -euo pipefail

echo "Starting port forwarding..."

oc project korrel8r

KORREL8R_POD_NAME=$(oc get pods -n korrel8r --selector=app.kubernetes.io/instance=korrel8r.korrel8r,app.kubernetes.io/name=korrel8r -o jsonpath='{.items[0].metadata.name}')

oc port-forward $KORREL8R_POD_NAME 9005:8443
