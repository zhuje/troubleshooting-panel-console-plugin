import { getAllQueryParams } from '../hooks/useURLState';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 */
describe('Test URL parsing', () => {
  it('Test getAllQueryParams', () => {
    const urlParameters = new URLSearchParams(
      'prometheus=openshift-monitoring/k8s&severity=warning&alertname=KubePodCrashLooping&container=bad-deployment&endpoint=https-main&job=kube-state-metrics&namespace=default&pod=bad-deployment-000000000-00000&reason=CrashLoopBackOff&service=kube-state-metrics&uid=00000000-0000-0000-0000-000000000000',
    );
    const allQueryParams = getAllQueryParams(urlParameters);
    expect(allQueryParams).toEqual([
      ['prometheus', 'openshift-monitoring/k8s'],
      ['severity', 'warning'],
      ['alertname', 'KubePodCrashLooping'],
      ['container', 'bad-deployment'],
      ['endpoint', 'https-main'],
      ['job', 'kube-state-metrics'],
      ['namespace', 'default'],
      ['pod', 'bad-deployment-000000000-00000'],
      ['reason', 'CrashLoopBackOff'],
      ['service', 'kube-state-metrics'],
      ['uid', '00000000-0000-0000-0000-000000000000'],
    ]);
  });

  it('Test getAllQueryParams with no query parameters', () => {
    const urlParameters = new URLSearchParams('');
    const allQueryParams = getAllQueryParams(urlParameters);
    expect(allQueryParams).toEqual([]);
  });
});
