import { QueryNode } from './korrel8r/query.types';
import { Korrel8rDomain } from './korrel8r/korrel8r.types';

const getDomain = (node: QueryNode) => node.class.split(':')[0] ?? '';

export const nodeToLabel = (node: QueryNode): string => {
  const domain = getDomain(node);
  switch (domain) {
    case Korrel8rDomain.Alert:
      return `Alert (${node.count})`;
    case Korrel8rDomain.Log:
      return `Logs (${node.count})`;
    case Korrel8rDomain.Metric:
      return `Metric (${node.count})`;
    case Korrel8rDomain.K8s:
      // eslint-disable-next-line no-case-declarations
      const nodeClass = node.class.split(':').at(1)?.split('.')?.at(0);
      if (!nodeClass) {
        // eslint-disable-next-line no-console
        console.warn(`Unknown node class: ${node.class}`);
        return `${node.class} (${node.count})`;
      }
      return `${nodeClass} (${node.count})`;
    case Korrel8rDomain.Netflow:
      return `Network (${node.count})`;
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unknown node type: ${node.class}`);
      return `${node.class} (${node.count})`;
  }
};
