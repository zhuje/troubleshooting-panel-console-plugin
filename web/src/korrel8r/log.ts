import { Korrel8rDomain, Korrel8rNode, NodeError } from './korrel8r.types';

enum LogClass {
  Application = 'application',
  Infrastructure = 'infrastructure',
  Audit = 'audit',
}

export class LogNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  logClass: LogClass;
  query: string;
  url: string;

  constructor(url: string, query: string, logClass: LogClass) {
    super();
    this.query = query;
    this.url = url;
    this.logClass = logClass;
  }

  static fromURL(url: string): Korrel8rNode {
    if (!url.startsWith('monitoring/logs'))
      throw new NodeError('Expected url to start with monitoring/logs');
    const urlQuerySegment = url.split('?').at(1);
    if (!urlQuerySegment) throw new NodeError('Expected URL to contain query parameters');

    const urlSearchParams = new URLSearchParams(urlQuerySegment);
    if (urlSearchParams.size === 0)
      throw new NodeError('Expected more than 0 relevant query parameters');

    let urlQueryString = urlSearchParams.get('q');
    if (!urlQueryString) throw new NodeError('Expected more than 0 relevant query parameters');

    let logClass = urlSearchParams.get('tenant');
    if (!logClass) {
      const logClassRegex = '{[^}]*log_type(=~*)"([^"]+)"}';

      logClass = urlQueryString.match(new RegExp(logClassRegex))?.at(2);
      if (!logClass) throw new NodeError('Expected query to contain log class');
    }
    if (urlQueryString.endsWith('|json')) {
      urlQueryString = urlQueryString.slice(0, -5);
    }
    if (!urlQueryString.includes('log_type')) {
      const endingBracket = urlQueryString.lastIndexOf('}');
      urlQueryString =
        urlQueryString.slice(0, endingBracket) +
        `,log_type="${logClass}"` +
        urlQueryString.slice(endingBracket);
    }

    const korrel8rQuery = `log:${logClass}:${urlQueryString}`;
    return new LogNode(url, korrel8rQuery, logClass as LogClass);
  }

  static fromQuery(query: string): Korrel8rNode {
    if (!query.startsWith('log:')) throw new NodeError('Expected query to start with log:');
    const queryAfterDomain = query.substring('log:'.length);
    if (!queryAfterDomain) throw new NodeError('Expected query to contain class');
    // Check if the query starts with one of the know log classes
    let logClass = '';
    switch (queryAfterDomain.split(':').at(0)) {
      case LogClass.Application:
        logClass = LogClass.Application;
        break;
      case LogClass.Infrastructure:
        logClass = LogClass.Infrastructure;
        break;
      case LogClass.Audit:
        logClass = LogClass.Audit;
        break;
      default:
        throw new NodeError('Unknown log class');
    }

    let queryAfterClass = queryAfterDomain.substring(logClass.length + 1);
    if (!queryAfterClass || queryAfterClass === '{}')
      throw new NodeError('Expected more than 0 relevant query parameters');
    if (!queryAfterClass.includes('log_type')) {
      queryAfterClass = queryAfterClass.slice(0, -1) + `,log_type="${logClass}"}|json`;
    } else {
      queryAfterClass += '|json';
    }

    const url = `monitoring/logs?q=${queryAfterClass}&tenant=${logClass}`;
    return new LogNode(url, query, logClass as LogClass);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
