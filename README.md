# OpenShift Console Troubleshooting Panel Plugin

This plugin is used to add the Troubleshooting Panel to view Korrel8r data. It is currently under construction and shows a new tab under observe.

## Docker image

Before you can deploy your plugin on a cluster, you must build an image and
push it to an image registry.

1. Build the image:

   ```sh
   docker build -t quay.io/my-repository/troubleshooting-panel-console-plugin:latest .
   ```

2. Run the image:

   ```sh
   docker run -it --rm -d -p 9001:80 quay.io/my-repository/troubleshooting-panel-console-plugin:latest
   ```

3. Push the image:

   ```sh
   docker push quay.io/my-repository/troubleshooting-panel-console-plugin:latest
   ```

NOTE: If you have a Mac with Apple silicon, you will need to add the flag
`--platform=linux/amd64` when building the image to target the correct platform
to run in-cluster.

## Deployment on cluster

A [Helm](https://helm.sh) chart is available to deploy the plugin to an OpenShift environment.

The following Helm parameters are required:

`plugin.image`: The location of the image containing the plugin that was previously pushed

Additional parameters can be specified if desired. Consult the chart [values](charts/openshift-console-plugin/values.yaml) file for the full set of supported parameters.

### Installing the Helm Chart

Install the chart using the name of the plugin as the Helm release name into a new namespace or an existing namespace as specified by the `plugin_console-plugin-template` parameter and providing the location of the image within the `plugin.image` parameter by using the following command:

```shell
helm upgrade -i troubleshooting-panel-console-plugin charts/openshift-console-plugin -n troubleshooting-panel-console-plugin --create-namespace --set plugin.image=quay.io/my-repository/troubleshooting-panel-console-plugin:latest
```


## Development

### Dependencies 
1. [yarn](https://yarnpkg.com/en/docs/install)
2. [oc](https://mirror.openshift.com/pub/openshift-v4/clients/oc/4.4/) 
3. [podman 3.2.0+](https://podman.io) or [Docker](https://www.docker.com) 
4. An OpenShift cluster


In one terminal window, run:

1. `yarn install`
2. `yarn run start`

In another terminal window, run:

1. `oc login` (requires [oc](https://console.redhat.com/openshift/downloads) and an [OpenShift cluster](https://console.redhat.com/openshift/create))
2. `yarn run start-console` (requires [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io))

This will run the OpenShift console in a container connected to the cluster
you've logged into. The plugin HTTP server runs on port 9001 with CORS enabled.
Navigate to <http://localhost:9000/observe/korrel8r> to see the running plugin.

#### Running start-console with Apple silicon and podman

If you are using podman on a Mac with Apple silicon, `yarn run start-console`
might fail since it runs an amd64 image. You can workaround the problem with
[qemu-user-static](https://github.com/multiarch/qemu-user-static) by running
these commands:

```bash
podman machine ssh
sudo -i
rpm-ostree install qemu-user-static
systemctl reboot
```

### i18n

You can use the `useTranslation` hook with the `plugin__troubleshooting-panel-console-plugin` with this namespace as follows:

```tsx
const Header: React.FC = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return <h1>{t('Hello, World!')}</h1>;
};
```

For labels in `console-extensions.json`, you can use the format
`%plugin__troubleshooting-panel-console-plugin~My Label%`. Console will replace the value with
the message for the current language from the `plugin__troubleshooting-panel-console-plugin`
namespace. For example:

```json
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "troubleshooting-panel",
      "name": "%plugin__troubleshooting-panel-console-plugin~Korrel8r%",
      "href": "/observe/korrel8r",
      "perspective": "admin",
      "section": "observe"
    }
  }
```

Running `yarn i18n` updates the JSON files in the `locales` folder of the
plugin template when adding or changing messages.

### Linting

This project adds prettier, eslint, and stylelint. Linting can be run with
`yarn run lint`.

The stylelint config disallows hex colors since these cause problems with dark
mode (starting in OpenShift console 4.11). You should use the
[PatternFly global CSS variables](https://patternfly-react-main.surge.sh/developer-resources/global-css-variables#global-css-variables)
for colors instead.

The stylelint config also disallows naked element selectors like `table` and
`.pf-` or `.co-` prefixed classes. This prevents plugins from accidentally
overwriting default console styles, breaking the layout of existing pages. The
best practice is to prefix your CSS classnames with your plugin name to avoid
conflicts. Please don't disable these rules without understanding how they can
break console styles!
