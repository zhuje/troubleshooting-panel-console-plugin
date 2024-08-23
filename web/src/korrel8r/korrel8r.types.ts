export enum Korrel8rDomain {
  Netflow = 'netflow',
  Metric = 'metric',
  Alert = 'alert',
  K8s = 'k8s',
  Log = 'log',
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
