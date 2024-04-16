import { AlertNode } from '../korrel8r/alert';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('Test AlertNode Parsing', () => {
  it('Test url to query parsing removes extraneous query parameters', () => {
    const url =
      'monitoring/alerts?prometheus=openshift-monitoring/k8s&severity=warning&alertname=KubePodCrashLooping&container=bad-deployment&endpoint=https-main&job=kube-state-metrics&namespace=default&pod=bad-deployment-000000000-00000&reason=CrashLoopBackOff&service=kube-state-metrics&uid=00000000-0000-0000-0000-000000000000';
    const expectedKorrel8rQuery =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment-000000000-00000"}';
    expect(AlertNode.fromURL(url)?.toQuery()).toEqual(expectedKorrel8rQuery);
  });

  it('Query => URL => Query', () => {
    const query =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment-000000000-00000"}';
    const expectedKorrel8rURL =
      'monitoring/alerts?alertname=KubePodCrashLooping&container=bad-deployment&namespace=default&pod=bad-deployment-000000000-00000&name=KubePodCrashLooping';
    const actualKorrel8rURL = AlertNode.fromQuery(query)?.toURL();
    expect(actualKorrel8rURL).toEqual(expectedKorrel8rURL);
    expect(AlertNode.fromURL(actualKorrel8rURL)?.toQuery()).toEqual(query);
  });

  it('URL => Query => URL', () => {
    const url =
      'monitoring/alerts?alertname=KubePodCrashLooping&container=bad-deployment&namespace=default&pod=bad-deployment-000000000-00000&name=KubePodCrashLooping';
    const expectedQuery =
      'alert:alert:{"alertname":"KubePodCrashLooping","container":"bad-deployment","namespace":"default","pod":"bad-deployment-000000000-00000"}';
    const actualQuery = AlertNode.fromURL(url)?.toQuery();
    expect(actualQuery).toEqual(expectedQuery);
    expect(AlertNode.fromQuery(expectedQuery)?.toURL()).toEqual(url);
  });

  it('Test url to query parsing with expected errors', () => {
    [
      {
        url: 'monitoring/alert',
        expected: 'Expected url to start with monitoring/alerts',
      },
      {
        url: 'monitoring/alerts',
        expected: 'Expected URL to contain query parameters',
      },
      {
        url: 'monitoring/alerts?prometheus=openshift-monitoring/k8s',
        expected: 'Expected more than 0 relevant query parameters',
      },
    ].forEach(({ url, expected }) => {
      expect(() => AlertNode.fromURL(url)).toThrow(expected);
    });
  });

  it('Test query to url parsing with expected errors', () => {
    [
      {
        query: 'alert:aler',
        expected: 'Expected query to start with alert:alert:',
      },
      {
        query: 'alert:alert:',
        expected: 'Expected query to contain {}',
      },
      {
        query: 'alert:alert:{}',
        expected: 'Expected query to contain relevant query parameters',
      },
    ].forEach(({ query, expected }) => {
      expect(() => AlertNode.fromQuery(query)).toThrow(expected);
    });
  });
});
