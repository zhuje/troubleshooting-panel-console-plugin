import { TraceNode } from '../korrel8r/trace';

const roundtrip = [
  {
    url: `observe/traces?tempostack=NAME&namespace=NAMESPACE&tenant=TENANT&q=${encodeURIComponent(
      '{resource.service.name = "article-service"}',
    )}`,
    query: `trace:trace:{resource.service.name = "article-service"}`,
  },
];

describe('TraceNode.fromURL', () => {
  it.each(roundtrip)('$url', ({ url, query }) =>
    expect(TraceNode.fromURL(url)?.toQuery()).toEqual(query),
  );
});

describe('TraceNode.fromQuery', () => {
  it.each(roundtrip)('$query', ({ query, url }) =>
    expect(TraceNode.fromQuery(query)?.toURL()).toEqual(url),
  );
});
