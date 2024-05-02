import { Korrel8rNode } from './korrel8r.types';

import { AlertNode } from './alert';
import { LogNode } from './log';
import { MetricNode } from './metric';
import { NetflowNode } from './netflow';
import { K8sNode } from './k8s';

export class Korrel8rNodeFactory {
  static fromURL(url: string): Korrel8rNode {
    if (url.startsWith('monitoring/alerts')) {
      return AlertNode.fromURL(url);
    } else if (url.startsWith('monitoring/logs')) {
      return LogNode.fromURL(url);
    } else if (url.startsWith('monitoring/query-browser')) {
      return MetricNode.fromURL(url);
    } else if (url.startsWith('netflow-traffic')) {
      return NetflowNode.fromURL(url);
    } else {
      return K8sNode.fromURL(url);
    }
  }
  static fromQuery(query: string): Korrel8rNode {
    switch (query.split(':').at(0)) {
      case 'alert':
        return AlertNode.fromQuery(query);
      case 'log':
        return LogNode.fromQuery(query);
      case 'metric':
        return MetricNode.fromQuery(query);
      case 'netflow':
        return NetflowNode.fromQuery(query);
      default:
        return K8sNode.fromQuery(query);
    }
  }
}
