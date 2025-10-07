import { K8sDomain } from './k8s';
import { Class, Constraint, Domain, joinPath, Query, unixMilliseconds, URIRef } from './types';

enum LogClass {
  application = 'application',
  infrastructure = 'infrastructure',
  audit = 'audit',
}

// TODO: Aggregated log links and k8s:pod style log queries ignore the containers parameter.

export class LogDomain extends Domain {
  private k8s: K8sDomain;
  private pod: Class;

  constructor() {
    super('log');
    this.k8s = new K8sDomain();
    this.pod = new Class('k8s', 'Pod');
  }

  class(name: string): Class {
    if (!LogClass[name]) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // There are 2 types of URL: pod logs, and logQL searches.
  linkToQuery(link: URIRef): Query {
    // First check for aggregated pod logs URL
    const [, namespace, name] =
      link.pathname.match(/k8s\/ns\/([^/]+)\/pods\/([^/]+)\/aggregated-logs/) || [];
    if (namespace && name) {
      const logClass = namespace.match(/^kube|^openshift-/)
        ? LogClass.infrastructure
        : LogClass.application;
      return new Query(
        this.class(logClass),
        `{kubernetes_namespace_name="${namespace}",kubernetes_pod_name="${name}"}`,
      );
    }
    // Assume this is a search URL
    const logQL = link.searchParams.get('q');
    const logClassStr =
      link.searchParams.get('tenant') || logQL?.match(/{[^}]*log_type(?:=~?)"([^"]+)"/)?.at(1);
    const logClass = LogClass[logClassStr as keyof typeof LogClass];
    if (!logClass) throw this.badLink(link);
    return this.class(logClass).query(logQL);
  }

  queryToLink(query: Query, constraint?: Constraint): URIRef {
    const logClass = LogClass[query.class.name as keyof typeof LogClass];
    if (!logClass) throw this.badQuery(query, 'unknown class');
    try {
      // First try to parse the selector as k8s pod selector
      const link = this.k8s.queryToLink(this.pod.query(query.selector));
      link.pathname = joinPath(link.pathname, 'aggregated-logs');
      return link;
    } catch {
      // Otherwise assume it is a LogQL query.
      return new URIRef('monitoring/logs', {
        q: query.selector,
        tenant: logClass,
        start: unixMilliseconds(constraint?.start),
        end: unixMilliseconds(constraint?.end),
      });
    }
  }
}
