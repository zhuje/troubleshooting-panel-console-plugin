import { MetricNode } from '../korrel8r/metric';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('Test MetricNode Parsing', () => {
  it('Query => URL => Query', () => {
    const query =
      'metric:metric:max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const expectedKorrel8rURL =
      'monitoring/query-browser?query0=max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const actualKorrel8rURL = MetricNode.fromQuery(query)?.toURL();
    expect(actualKorrel8rURL).toEqual(expectedKorrel8rURL);
    expect(MetricNode.fromURL(actualKorrel8rURL)?.toQuery()).toEqual(query);
  });

  it('URL => Query => URL', () => {
    const url =
      'monitoring/query-browser?query0=max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const expectedQuery =
      'metric:metric:max_over_time(kube_pod_container_status_waiting_reason{job="kube-state-metrics",namespace=~"(openshift-.*|kube-.*|default)",reason="CrashLoopBackOff"}[5m]) <= 1';
    const actualQuery = MetricNode.fromURL(url)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(MetricNode.fromQuery(expectedQuery)?.toURL()).toEqual(url);
  });

  it('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'monitoring/query-browse',
        expected: 'Expected url to start with monitoring/query-browser',
      },
      {
        url: 'monitoring/query-browser',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'monitoring/query-browser?',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'monitoring/query-browser?query1=wrong_query',
        expected: 'Expected to find query0',
      },
    ].forEach(({ url, expected }) => {
      expect(() => MetricNode.fromURL(url)).toThrow(expected);
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'metric:metri',
        expected: 'Expected query to start with metric:metric:',
      },
      {
        query: 'metric:metric:',
        expected: 'Expected korrel8r query to contain a prometheus query',
      },
    ].forEach(({ query, expected }) => {
      expect(() => MetricNode.fromQuery(query)).toThrow(expected);
    });
  });
});
