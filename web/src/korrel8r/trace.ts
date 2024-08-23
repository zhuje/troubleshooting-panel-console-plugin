import { Korrel8rNode } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';

// URL format: `observe/traces?namespace=<tempoNamespace>&name=<tempoName>&tenant=<tempoTenant>&q=<traceQL>` +

// FIXME hard-coded tempo location, need to make this configurable/agreed between console & korrel8r.
// Get from the console page environment (change from using URL as context?)
const [tempoNamespace, tempoName, tempoTenant] = ['NAMESPACE', 'NAME', 'TENANT'];

export class TraceNode extends Korrel8rNode {
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    const [, params] = parseURL('trace', 'observe/traces', url);
    const traceQL = params.get('q');
    // FIXME need to handle store location params also.
    return new TraceNode(url, `trace:trace:${traceQL}`);
  }

  static fromQuery(query: string): Korrel8rNode {
    const [, traceQL] = parseQuery('trace', query);
    // FIME get variable tempo address info from query or config...
    return new TraceNode(
      `observe/traces?tempostack=${tempoName}&namespace=${tempoNamespace}&tenant=${tempoTenant}&` +
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
