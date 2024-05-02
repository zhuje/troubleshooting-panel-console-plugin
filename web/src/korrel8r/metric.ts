import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';

export class MetricNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    if (!url.startsWith('monitoring/query-browser'))
      throw new NodeError('Expected url to start with monitoring/query-browser');
    const urlObject = new URL('http://domain' + url);
    const urlQuerySegment = urlObject.search;
    if (!urlQuerySegment) throw new NodeError('Expected URL to contain query parameters');

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    if (urlSearchParams.size === 0)
      throw new NodeError('Expected more than 0 relevant query parameters');
    const promqlQuery = urlSearchParams.get('query0');
    if (!promqlQuery) throw new NodeError('Expected to find query0');
    const query = `metric:metric:${promqlQuery}`;

    return new MetricNode(url, query);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('metric:metric:'))
      throw new NodeError('Expected query to start with metric:metric:');

    const queryAfterClass = query.substring('metric:metric:'.length);
    if (!queryAfterClass)
      throw new NodeError('Expected korrel8r query to contain a prometheus query');
    if (queryAfterClass === '{}') {
      throw new NodeError('Expected query to contain relevant query parameters');
    }

    const url = `monitoring/query-browser?query0=${queryAfterClass}`;
    return new MetricNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
