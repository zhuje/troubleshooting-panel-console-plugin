import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';
import { getCachedResources } from '../getResources';

type GroupVersionKind = {
  group?: string;
  version?: string;
  kind: string;
};

const eventGroupVersionKind: GroupVersionKind = {
  kind: 'Event',
  version: 'v1',
};

type QueryData = {
  name?: string;
  namespace?: string;
  labels?: { [key: string]: string };
  fields?: { [key: string]: string };
};

type Model = {
  kind: string;
  apiVersion: string; // apiVersion is vN or group/vN
  path: string;
  verbs: string[];
};

const pathRegex = new RegExp(
  '(?:k8s|search)/(?:(?:ns/([^/]+))|cluster|all-namespaces)(?:/([^/]+)(?:/([^/]+))?)?(/events)?/?$',
);

export class K8sNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    const urlObject = new URL(url, 'http://domain');
    const params = new URLSearchParams(urlObject.search);
    const [, namespace, resource, name, events] = urlObject.pathname.match(pathRegex);
    const groupVersionKind = this.getGroupVersionKind(resource, params.get('kind'));

    if (!groupVersionKind || !groupVersionKind.kind) throw new NodeError(`invalid k8s URL: ${url}`);
    if (events) {
      const data = {
        fields: {
          'involvedObject.namespace': namespace,
          'involvedObject.name': name,
          'involvedObject.apiVersion': this.apiVersionFor(groupVersionKind),
          'involvedObject.kind': groupVersionKind.kind,
        },
      };
      const query = `${K8sNode.classFor(eventGroupVersionKind)}:${JSON.stringify(data)}`;
      return new K8sNode(url, query);
    } else {
      const data = {
        namespace: namespace,
        name: name,
        labels: K8sNode.parseSelector(params.get('q')) || undefined,
      };
      return new K8sNode(url, `${K8sNode.classFor(groupVersionKind)}:${JSON.stringify(data)}`);
    }
  }

  static fromQuery(query: string): Korrel8rNode {
    const [, domain, clazz, dataStr] = query.match(/^([^:]+):([^:]+):(.+)$/) ?? [];
    if (domain != 'k8s') throw new NodeError(`invalid k8s query: ${query}`);
    const [, kind, version, group] = clazz.match(/^([^.]+)(?:\.([^.]*)(?:\.(.*))?)?$/) ?? [];
    if (!kind) throw new NodeError(`invalid k8s class: ${clazz}`);
    let gvk: GroupVersionKind = { kind: kind, version: version || 'v1', group: group || undefined };

    let data: QueryData;
    try {
      data = JSON.parse(dataStr) as QueryData;
    } catch (e) {
      throw new NodeError(`invalid k8s query data: ${dataStr}: ${e}`);
    }

    let namespace = '',
      name = '',
      events = '';
    if (gvk.kind == eventGroupVersionKind.kind && !gvk.group) {
      events = '/events';
      // Focus on the events involved object rather than the event.
      gvk = this.makeGroupVersionKind(
        data.fields['involvedObject.apiVersion'],
        data.fields['involvedObject.kind'],
      );
      namespace = data.fields['involvedObject.namespace'] || '';
      name = data.fields['involvedObject.name'] || '';
    } else {
      namespace = data.namespace || '';
      name = data.name || '';
    }

    // Prepare parts of the URL
    const [gvk2, resource] = this.findKind(gvk); // Fill out partial GVK
    gvk = gvk2;
    const nsPath = namespace ? `ns/${namespace}` : 'all-namespaces';
    const selector = Object.keys(data.labels || {})
      .map((k) => `${k}=${data.labels[k]}`)
      .join(',');
    const qParam = selector ? `q=${encodeURIComponent(selector)}` : '';

    let url: string;
    if (!name && !namespace && qParam) {
      // Search URL
      url =
        `search/${nsPath}?${qParam}&kind=` +
        `${gvk.group || 'core'}~` +
        `${gvk.version || undefined}~` +
        `${gvk.kind}`;
    } else {
      // Resource URL
      url = `k8s/${nsPath}/${resource}${name ? `/${name}` : ''}${
        qParam ? `?${qParam}` : ''
      }${events}`;
    }
    return new K8sNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }

  // Return a GVK for the resource (path) or throw an error
  private static getGroupVersionKind(resource: string, kind: string): GroupVersionKind {
    if (resource && !resource.includes('~')) {
      // Try the resource as a straight resource name
      if (resource === 'projects') resource = 'namespaces';
      return this.findResource(resource);
    }
    if (resource || kind) {
      // Either kind or resource may be a g~v~k string.
      const parts = (resource || kind).split('~');
      if (parts.length !== 3 || !parts[2]) throw new NodeError('invalid k8s URL');
      const gvk: GroupVersionKind = {
        group: !parts[0] || parts[0] === 'core' ? undefined : parts[0],
        version: parts[1] || undefined,
        kind: parts[2],
      };
      return this.findKind(gvk)[0]; // Fill it out
    }
    throw new NodeError('invalid k8s URL');
  }

  // parseSelector parses a selector string as a query map.
  private static parseSelector(selector: string): { [key: string]: string } {
    if (!selector) return undefined;
    const labels: { [key: string]: string } = {};
    selector.split(',').forEach((pair: string) => {
      const [key, value] = pair.split(/=(.*)/);
      labels[key] = value;
    });
    return labels || undefined;
  }

  // findResource returns the GroupVersionKind for a resource name (path component)
  private static findResource(resource: string): GroupVersionKind {
    const model = getCachedResources()?.models.find(
      (m: Model) => m.path === resource && m.verbs.includes('watch'),
    );
    if (!model) throw new NodeError(`k8s resource not recognized: ${resource} `);
    return K8sNode.makeGroupVersionKind(model.apiVersion, model.kind);
  }

  // Returns the model matching a gvk or throws an error.
  private static findKind(gvk: GroupVersionKind): [fullGVK: GroupVersionKind, resource: string] {
    const apiVersionMatch = `${gvk.group ? `${gvk.group}/` : ''}${gvk.version || ''}`;
    const model = getCachedResources()?.models.find(
      (m: Model) =>
        m.kind === gvk.kind && m.verbs.includes('watch') && m.apiVersion.match(apiVersionMatch),
    );
    if (!model) throw new NodeError(`k8s kind not recognized: ${JSON.stringify(gvk)} `);
    return [this.makeGroupVersionKind(model.apiVersion, model.kind), model.path];
  }

  // makeGroupVersionKind from a kind and an apiVersion.
  private static makeGroupVersionKind(apiVersion: string, kind: string): GroupVersionKind {
    const parts = apiVersion.split('/');
    if (parts.length == 1) return { version: parts[0] || undefined, kind: kind };
    if (parts.length == 2)
      return { group: parts[0] || undefined, version: parts[1] || undefined, kind: kind };
    throw new NodeError('invalid k8s apiVersion: ${apiVersion}');
  }

  private static apiVersionFor(gvk: GroupVersionKind): string {
    return `${gvk.group ? `${gvk.group}/` : ''}${gvk.version || 'v1'}`;
  }

  private static classFor(gvk: GroupVersionKind): string {
    return `k8s:${gvk.kind}.${gvk.version || 'v1'}.${gvk.group || ''}`;
  }
}
