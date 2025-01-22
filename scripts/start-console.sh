#!/usr/bin/env bash

set -euo pipefail

CONSOLE_IMAGE=${CONSOLE_IMAGE:="quay.io/openshift/origin-console:latest"}
CONSOLE_PORT=${CONSOLE_PORT:=9000}
npm_package_consolePlugin_name=${npm_package_consolePlugin_name:="troubleshooting-panel-console-plugin"}
CONSOLE_IMAGE_PLATFORM=${CONSOLE_IMAGE_PLATFORM:="linux/amd64"}

echo "Starting local OpenShift console..."

npm_package_consolePlugin_name="troubleshooting-panel-console-plugin"

BRIDGE_USER_AUTH="disabled"
BRIDGE_K8S_MODE="off-cluster"
BRIDGE_K8S_AUTH="bearer-token"
BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS=true
BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT=$(oc whoami --show-server)
# The monitoring operator is not always installed (e.g. for local OpenShift). Tolerate missing config maps.
set +e
BRIDGE_K8S_MODE_OFF_CLUSTER_THANOS=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.thanosPublicURL}' 2>/dev/null)
BRIDGE_K8S_MODE_OFF_CLUSTER_ALERTMANAGER=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.alertmanagerPublicURL}' 2>/dev/null)
set -e
BRIDGE_K8S_AUTH_BEARER_TOKEN=$(oc whoami --show-token 2>/dev/null)
BRIDGE_USER_SETTINGS_LOCATION="localstorage"
BRIDGE_I18N_NAMESPACES="plugin__${npm_package_consolePlugin_name}"

echo "API Server: $BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT"
echo "Console Image: $CONSOLE_IMAGE"
echo "Console URL: http://localhost:${CONSOLE_PORT}"
echo "Console Platform: $CONSOLE_IMAGE_PLATFORM"


function bridge_vars_env {
    # Originally, (set | grep BRIDGE) was used, but it doesn't escape BRIDGE_PLUGIN_PROXY properly.
    # We use "${!var}" to get the variable value by dynamic name.
    for var in $(set | grep ^BRIDGE | sed 's/=.*//'); do
        printf "%s=%s\n" "$var" "${!var}"
    done
}

# Prefer podman if installed. Otherwise, fall back to docker.
if [ -x "$(command -v podman)" ]; then
    if [ "$(uname -s)" = "Linux" ]; then
        # Use host networking on Linux since host.containers.internal is unreachable in some environments.
        BRIDGE_PLUGINS="troubleshooting-panel-console-plugin=http://localhost:9002,monitoring-plugin=http://localhost:9001"
        BRIDGE_PLUGIN_PROXY="{\"services\": [{\"consoleAPIPath\": \"/api/proxy/plugin/${npm_package_consolePlugin_name}/korrel8r/\", \"endpoint\":\"https://localhost:9005\",\"authorize\":true}]}"
        podman run --pull always --platform $CONSOLE_IMAGE_PLATFORM --rm --network=host --env-file <(bridge_vars_env) $CONSOLE_IMAGE
    else
        BRIDGE_PLUGINS="troubleshooting-panel-console-plugin=http://host.containers.internal:9002,monitoring-plugin=http://host.containers.internal:9001"
        BRIDGE_PLUGIN_PROXY="{\"services\": [{\"consoleAPIPath\": \"/api/proxy/plugin/${npm_package_consolePlugin_name}/korrel8r/\", \"endpoint\":\"https://host.containers.internal:9005\",\"authorize\":true}]}"
        podman run --pull always --platform $CONSOLE_IMAGE_PLATFORM \
            --rm -p "$CONSOLE_PORT":9000 \
            --env-file <(bridge_vars_env) \
            $CONSOLE_IMAGE
    fi
else
    BRIDGE_PLUGINS="troubleshooting-panel-console-plugin=http://host.docker.internal:9002,monitoring-plugin=http://host.docker.internal:9001"
    BRIDGE_PLUGIN_PROXY="{\"services\": [{\"consoleAPIPath\": \"/api/proxy/plugin/${npm_package_consolePlugin_name}/korrel8r/\", \"endpoint\":\"https://host.docker.internal:9005\",\"authorize\":true}]}"
    docker run --pull always --platform $CONSOLE_IMAGE_PLATFORM --rm -p "$CONSOLE_PORT":9000 --env-file <(bridge_vars_env) $CONSOLE_IMAGE
fi
