import { LogNode } from '../korrel8r/log';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('Test LogNode Parsing', () => {
  it('Test different log type urls to query parsing', () => {
    [
      {
        url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}|json&tenant=infrastructure',
        expected:
          'log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}',
      },
      {
        url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}|json',
        expected:
          'log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}',
      },
      {
        url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000"}|json&tenant=infrastructure',
        expected:
          'log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}',
      },
    ].forEach(({ url, expected }) => {
      expect(LogNode.fromURL(url)?.toQuery()).toEqual(expected);
    });
  });

  it('URL => Query => URL', () => {
    const url =
      'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}|json&tenant=infrastructure';
    const expectedQuery =
      'log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}';
    const actualQuery = LogNode.fromURL(url)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(LogNode.fromQuery(expectedQuery)?.toURL()).toEqual(url);
  });

  it('Query => URL => Query', () => {
    const query =
      'log:infrastructure:{kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}';
    const expectedURL =
      'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000",log_type="infrastructure"}|json&tenant=infrastructure';
    const actualURL = LogNode.fromQuery(query)?.toURL();
    expect(actualURL).toEqual(expectedURL);
    expect(LogNode.fromURL(actualURL)?.toQuery()).toEqual(query);
  });

  it('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'monitoring/log',
        expected: 'Expected url to start with monitoring/logs',
      },
      {
        url: 'monitoring/logs',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'monitoring/logs?',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="bad-deployment-000000000-00000"}|json',
        expected: 'Expected query to contain log class',
      },
      {
        url: 'monitoring/logs?tenant=infrastructure',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ url, expected }) => {
      expect(() => LogNode.fromURL(url)).toThrow(expected);
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'lo',
        expected: 'Expected query to start with log:',
      },
      {
        query: 'log:',
        expected: 'Expected query to contain class',
      },
      {
        query: 'log:incorrect',
        expected: 'Unknown log class',
      },
      {
        query: 'log:infrastructure:',
        expected: 'Expected more than 0 relevant query parameters',
      },
      {
        query: 'log:infrastructure:{}',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ query, expected }) => {
      expect(() => LogNode.fromQuery(query)).toThrow(expected);
    });
  });
});
