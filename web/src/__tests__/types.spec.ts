import {
  Class,
  Constraint,
  Domain,
  Domains,
  Node,
  Query,
  QueryRef,
  URIRef,
} from '../korrel8r/types';

import * as api from '../korrel8r/client';

describe('Query', () => {
  it('converts to/from string', () => {
    const abc = new Class('a', 'b').query('c=d');
    expect(abc.toString()).toEqual('a:b:c=d');
    expect(Query.parse('a:b:c=d')).toEqual(abc);
    expect(() => Query.parse('x')).toThrow(/invalid.*: x/);
  });
});

class FakeDomain extends Domain {
  constructor(name: string) {
    super(name);
  }

  class(name: string): Class | undefined {
    return new Class(this.name, name);
  }

  linkToQuery(link: URIRef): Query {
    const m = link?.pathname?.match(new RegExp(`/?${this.name}/([^/]+)`));
    if (!m) throw this.badLink(link);
    return new Class(this.name, m[1]).query(link.searchParams.toString());
  }

  queryToLink(query: Query, constraint?: Constraint): string {
    if (!query || !query.class || query.class.domain != this.name) throw this.badQuery(query);
    const c = constraint ? '&constraint=' + JSON.stringify(constraint) : '';
    return `${query.class.domain}/${query.class.name}?${query.selector}${c}`;
  }
}

const start = new Date(1969, 2, 21);
const end = new Date();

describe('Constraint', () => {
  it.each([
    { clientC: {}, typesC: {} },
    { clientC: { start: start.toISOString(), end: end.toISOString() }, typesC: { start, end } },
    { clientC: { limit: 50, timeout: '1111111111' }, typesC: { limit: 50, timeoutNS: 1111111111 } },
  ] as Array<{ clientC: api.Constraint; typesC: Partial<Constraint> }>)(
    'from/toAPI %s',
    ({ clientC, typesC }) => {
      const c = new Constraint(typesC);
      expect(Constraint.fromAPI(clientC)).toEqual(c);
      expect(c.toAPI()).toEqual(clientC); // Round trip.
    },
  );
});

describe('Domain', () => {
  const d = new FakeDomain('a');
  const abc = d.class('b').query('c=d');
  it('queryToLink', () => {
    expect(d.queryToLink(abc)).toEqual('a/b?c=d');
    const query = Query.parse('x:b:c');
    expect(() => d.queryToLink(query)).toThrow('domain a: invalid query: x:b:c');
  });
  it('linkToQuery', () => {
    expect(d.linkToQuery(new URIRef('a/b?c=d'))).toEqual(abc);
    expect(d.linkToQuery(new URIRef('/a/b?c=d'))).toEqual(abc);
    expect(d.linkToQuery(new URIRef('http://blah/a/b?c=d'))).toEqual(abc);
  });
});

describe('Domains', () => {
  const ds = new Domains(...['a', 'x'].map((name: string): Domain => new FakeDomain(name)));
  const abc = Query.parse('a:b:c=d');
  const xyz = Query.parse('x:y:z=z');
  it('queryToLink', () => {
    expect(ds.queryToLink(abc)).toEqual('a/b?c=d');
    expect(ds.queryToLink(xyz)).toEqual('x/y?z=z');
    expect(() => ds.queryToLink(Query.parse('z:b:c'))).toThrow(/unknown domain .*: z:b:c/);
  });
  it('linkToQuery', () => {
    expect(ds.linkToQuery(new URIRef('x/y?z=z'))).toEqual(xyz);
    expect(ds.linkToQuery(new URIRef('http://blah/a/b?c=d'))).toEqual(abc);
  });
});

describe('URIRef', () => {
  it('constructor', () => {
    const u = new URIRef('/a/b?c=d&x=y#z');
    expect(u.pathname).toEqual('/a/b');
    expect(Object.fromEntries(u.searchParams.entries())).toEqual({ c: 'd', x: 'y' });
    expect(u.hash).toEqual('#z');
  });

  it('constructor with moreParams', () => {
    const u = new URIRef('/a/b?c=d&x=y', { c: 'dd', q: 'foo' });
    expect(u.pathname).toEqual('/a/b');
    expect(Object.fromEntries(u.searchParams.entries())).toEqual({ c: 'dd', x: 'y', q: 'foo' });
  });

  it.each(['', '/a/b?c=d&x=y#z', '/path', 'relpath', '/k8s/ns/netobserv/core~v1~Pod'])(
    'round trip: %s',
    (str) => {
      expect(new URIRef(str).toString()).toEqual(str);
    },
  );

  it.each([
    ['a/b?c=d&x=y#z', 'http://example/x/', 'http://example/x/a/b?c=d&x=y#z'], // Relative
    ['/a/b?c=d&x=y#z', 'http://example/x/', 'http://example/a/b?c=d&x=y#z'], // Absolute
  ])('resolve to URL: %s', (ref, base, want) => {
    expect(new URIRef(ref).resolve(base).toString()).toEqual(want);
  });
});

describe('Node', () => {
  const domains = new Domains(...['a', 'x'].map((name: string): Domain => new FakeDomain(name)));

  it('constructor', () => {
    expect(
      new Node(
        {
          class: 'a:b',
          count: 10,
          queries: [
            { query: 'a:b:c', count: 5 },
            { query: 'a:b:d', count: 5 },
          ],
        },
        domains,
      ),
    ).toEqual({
      classStr: 'a:b',
      class: { domain: 'a', name: 'b' },
      count: 10,
      queries: [
        {
          count: 5,
          queryStr: 'a:b:c',
          query: { class: { domain: 'a', name: 'b' }, selector: 'c' },
          link: 'a/b?c',
        },
        {
          count: 5,
          queryStr: 'a:b:d',
          query: { class: { domain: 'a', name: 'b' }, selector: 'd' },
          link: 'a/b?d',
        },
      ],
    });
  });

  it('constructor constraint', () => {
    expect(
      new Node(
        {
          class: 'a:b',
          count: 10,
          queries: [{ query: 'a:b:c', count: 5 }],
        },
        domains,
        new Constraint({ start, end }),
      ),
    ).toEqual({
      class: { domain: 'a', name: 'b' } as Class,
      classStr: 'a:b',
      count: 10,
      queries: [
        {
          count: 5,
          queryStr: 'a:b:c',
          query: { class: { domain: 'a', name: 'b' }, selector: 'c' } as Query,
          link: `a/b?c&constraint={"start":"${start.toISOString()}","end":"${end.toISOString()}"}`,
        } as QueryRef,
      ],
    } as Node);
  });

  it('constructor class mismatch', () => {
    expect(
      new Node({ class: 'a:b', queries: [{ query: 'a:x:c', count: 5 }], count: 1 }, domains),
    ).toEqual({
      class: { domain: 'a', name: 'b' },
      count: 1,
      classStr: 'a:b',
      queries: [
        {
          count: 5,
          error: 'query a:x:c: wrong class, expected a:b',
          query: {
            class: { domain: 'a', name: 'x' },
            selector: 'c',
          },
          queryStr: 'a:x:c',
          link: 'a/x?c',
        },
      ],
      error: 'No valid links',
    } as Node);
  });

  it('constructor bad class', () => {
    expect(new Node({ class: 'foobar', count: 1 }, domains)).toEqual({
      classStr: 'foobar',
      count: 1,
      error: 'node foobar: invalid class: foobar',
    });
  });
});
