export enum Korrel8rDomain {
  Netflow = 'netflow',
  Metric = 'metric',
  Alert = 'alert',
  K8s = 'k8s',
  Log = 'log',
  Trace = 'trace',
}

export abstract class Korrel8rNode {
  static fromURL: (url: string) => Korrel8rNode;
  static fromQuery: (query: string) => Korrel8rNode;
  abstract toURL(): string;
  abstract toQuery(): string;
}

export class NodeError extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

// Thrown when a URL or Query does not match the Korrel8rNode class trying to parse it.
export class WrongDomainError extends NodeError {
  constructor(reason: string) {
    super(reason);
  }
}
