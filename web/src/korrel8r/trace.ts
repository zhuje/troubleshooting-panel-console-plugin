import { Korrel8rNode } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';

export class TraceNode extends Korrel8rNode {
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  // TODO: Add support for pulling parameters from filter query parameters
  static fromURL(url: string): Korrel8rNode {
    const [, params] = parseURL('trace', 'observe/traces', url);
    const traceQL = params.get('q');
    return new TraceNode(url, `trace:trace:${traceQL}`);
  }

  static fromQuery(query: string): Korrel8rNode {
    const [, traceQL] = parseQuery('trace', query);
    // FIME get variable tempo address info from query or config...
    return new TraceNode(
      `observe/traces?namespace=openshift-tracing&name=platform&tenant=platform&` +
        `q=${encodeURIComponent(traceQL)}`,
      query,
    );
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
