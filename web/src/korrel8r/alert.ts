import { Korrel8rNode, Korrel8rDomain, NodeError } from './korrel8r.types';

export const ALLOWED_ALERT_QUERY_KEYS = ['alert', 'alertname', 'container', 'namespace', 'pod'];
export class AlertNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    if (!url.startsWith('monitoring/alerts'))
      throw new NodeError('Expected url to start with monitoring/alerts');
    const urlObject = new URL('http://domain' + url);
    const urlQuerySegment = urlObject.search;
    if (!urlQuerySegment) throw new NodeError('Expected URL to contain query parameters');

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    const queryParams = Array.from(urlSearchParams.entries()).filter(([key]) =>
      ALLOWED_ALERT_QUERY_KEYS.includes(key),
    );
    if (queryParams.length === 0)
      throw new NodeError('Expected more than 0 relevant query parameters');

    const query = `alert:alert:{${queryParams
      .map(([key, value]) => `"${key}":"${value}"`)
      .join(',')}}`;
    return new AlertNode(url, query);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('alert:alert:'))
      throw new NodeError('Expected query to start with alert:alert:');

    const queryAfterClass = query.substring('alert:alert:'.length);
    if (!queryAfterClass) throw new NodeError('Expected query to contain {}');

    let queryJSON;
    try {
      queryJSON = JSON.parse(queryAfterClass);
    } catch (e) {
      throw new NodeError('');
    }
    if (Object.keys(queryJSON).length === 0)
      throw new NodeError('Expected query to contain relevant query parameters');
    if (queryJSON['alertname'] && !queryJSON['name']) {
      queryJSON['name'] = queryJSON['alertname'];
    }
    const url = `monitoring/alerts?${new URLSearchParams(queryJSON).toString()}`;
    return new AlertNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
