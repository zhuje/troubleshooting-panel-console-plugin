import { NetflowNode } from '../korrel8r/netflow';

/**
 * Use example query from korrel8r docs
 *
 * https://github.com/korrel8r/korrel8r/blob/main/pkg/domains/netflow/netflow.go
 */
describe('Test NetflowNode Parsing', () => {
  it('URL => Query => URL', () => {
    const url =
      'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json&tenant=network';
    const expectedQuery = 'netflow:network:{SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}';
    const actualQuery = NetflowNode.fromURL(url)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(NetflowNode.fromQuery(expectedQuery)?.toURL()).toEqual(url);
  });

  it('Query => URL => Query', () => {
    const query = 'netflow:network:{SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}';
    const expectedURL =
      'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json&tenant=network';
    const actualURL = NetflowNode.fromQuery(query)?.toURL();
    expect(actualURL).toEqual(expectedURL);
    expect(NetflowNode.fromURL(actualURL)?.toQuery()).toEqual(query);
  });

  it('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'netflow-traffi',
        expected: 'Expected url to start with netflow-traffic',
      },
      {
        url: 'netflow-traffic',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'netflow-traffic?',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'netflow-traffic?q={SrcK8S_Type="Pod", SrcK8S_Namespace="myNamespace"}|json',
        expected: 'Expected query to contain netflow class',
      },
      {
        url: 'netflow-traffic?tenant=network',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ url, expected }) => {
      expect(() => NetflowNode.fromURL(url)).toThrow(expected);
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'netflo',
        expected: 'Expected query to start with netflow:',
      },
      {
        query: 'netflow:',
        expected: 'Expected query to contain class',
      },
      {
        query: 'netflow:incorrect',
        expected: 'Expected netflow class to be network',
      },
      {
        query: 'netflow:network:',
        expected: 'Expected more than 0 relevant query parameters',
      },
      {
        query: 'netflow:network:{}',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ query, expected }) => {
      expect(() => NetflowNode.fromQuery(query)).toThrow(expected);
    });
  });
});
