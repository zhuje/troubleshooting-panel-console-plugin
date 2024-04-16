import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';

export class NetflowNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    if (!url.startsWith('netflow-traffic'))
      throw new NodeError('Expected url to start with netflow-traffic');
    const urlObject = new URL('http://domain' + url);
    const urlQuerySegment = urlObject.search;
    if (!urlQuerySegment) throw new NodeError('Expected URL to contain query parameters');

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    if (urlSearchParams.size === 0)
      throw new NodeError('Expected more than 0 relevant query parameters');

    let urlQueryString = urlSearchParams.get('q');
    if (!urlQueryString) throw new NodeError('Expected more than 0 relevant query parameters');

    const netflowClass = urlSearchParams.get('tenant');
    if (!netflowClass) throw new NodeError('Expected query to contain netflow class');
    if (netflowClass !== 'network') throw new NodeError('Expected netflow class to be network');

    if (urlQueryString.endsWith('|json')) {
      urlQueryString = urlQueryString.slice(0, -5);
    }

    const korrel8rQuery = `netflow:network:${urlQueryString}`;
    return new NetflowNode(url, korrel8rQuery);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('netflow:')) throw new NodeError('Expected query to start with netflow:');
    const queryAfterDomain = query.substring('netflow:'.length);
    if (!queryAfterDomain) throw new NodeError('Expected query to contain class');
    const netflowClass = queryAfterDomain.split(':').at(0);
    if (netflowClass !== 'network') throw new NodeError('Expected netflow class to be network');

    let queryAfterClass = queryAfterDomain.substring(netflowClass.length + 1);
    if (!queryAfterClass || queryAfterClass === '{}')
      throw new NodeError('Expected more than 0 relevant query parameters');

    queryAfterClass += '|json';

    const url = `netflow-traffic?q=${queryAfterClass}&tenant=${netflowClass}`;
    return new NetflowNode(url, query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
