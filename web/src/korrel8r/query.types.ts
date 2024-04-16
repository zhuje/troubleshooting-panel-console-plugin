export type QueryNode = {
  class: string;
  count: number;
  queries?: Array<QueryCount>;
};

export type QueryEdge = {
  start: string;
  goal: string;
  rules?: Array<QueryRule>;
};

export type QueryStart = {
  class: string;
  queries: string[];
};

export type QueryRule = {
  name: string;
  queries: Array<QueryCount>;
};

export type QueryCount = {
  query: string;
  count: number;
};

export type Korrel8rResponse = Array<QueryNode>;

export type Korrel8rGraphNeighboursResponse = {
  nodes: Array<QueryNode>;
  edges?: Array<QueryEdge>;
};
