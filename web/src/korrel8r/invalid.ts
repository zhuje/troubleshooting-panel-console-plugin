import { Korrel8rDomain, Korrel8rNode } from './korrel8r.types';

export class InvalidNode extends Korrel8rNode {
  domain: Korrel8rDomain = Korrel8rDomain.Alert;
  query: string;
  url: string;

  constructor(url: string, query: string) {
    super();
    this.query = query;
    this.url = url;
  }

  static fromURL(url: string): Korrel8rNode {
    return new InvalidNode(url, 'invalid');
  }

  static fromQuery(query: string): Korrel8rNode {
    return new InvalidNode('invalid', query);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
