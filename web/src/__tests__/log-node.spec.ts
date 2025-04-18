import { LogNode } from '../korrel8r/log';
import { Constraint } from '../redux-actions';

describe('LogNode.fromURL', () => {
  it.each([
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default"` + `,kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",' +
          'kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` + `kubernetes_pod_name="foo"}`,
    },
    {
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo",log_type="infrastructure"}',
      )}&tenant=infrastructure`,
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` +
        `kubernetes_pod_name="foo",log_type="infrastructure"}`,
    },
    {
      url: `/k8s/ns/foo/pods/bar/aggregated-logs`,
      query: `log:application:{kubernetes_namespace_name="foo",kubernetes_pod_name="bar"}`,
    },
    {
      url: `/k8s/ns/kube/pods/bar/aggregated-logs`,
      query: `log:infrastructure:{kubernetes_namespace_name="kube",kubernetes_pod_name="bar"}`,
    },
  ])('$url', ({ url, query }) => expect(LogNode.fromURL(url)?.toQuery()).toEqual(query));
});

describe('LogNode.fromQuery', () => {
  it.each([
    {
      query:
        `log:infrastructure:{kubernetes_namespace_name="default",` + `kubernetes_pod_name="foo"}`,
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      constraint: {
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      } as Constraint,
    },
    {
      query: 'log:infrastructure:{kubernetes_namespace_name="default",log_type="infrastructure"}',
      url: `monitoring/logs?q=${encodeURIComponent(
        '{kubernetes_namespace_name="default",log_type="infrastructure"}',
      )}&tenant=infrastructure&start=1742896800000&end=1742940000000`,
      constraint: {
        start: '2025-03-25T10:00:00.000Z',
        end: '2025-03-25T22:00:00.000Z',
      } as Constraint,
    },
  ])('$query', ({ url, query, constraint }) =>
    expect(LogNode.fromQuery(query, constraint)?.toURL()).toEqual(url),
  );
});

describe('expected errors', () => {
  it.each([
    {
      url: 'monitoring/log',
      expected: 'Expected log URL: monitoring/log',
    },
    {
      url: 'monitoring/logs?q={kubernetes_namespace_name="default",kubernetes_pod_name="foo"}',
      expected: 'No log class found in URL',
    },
  ])('error from url: $url', ({ url, expected }) => {
    expect(() => LogNode.fromURL(url)).toThrow(expected);
  });

  it.each([
    {
      query: 'foo:bar:baz',
      expected: 'Expected log query: foo:bar:baz',
    },
    {
      query: 'log:incorrect:{}',
      expected: 'Expected log class in query',
    },
  ])('error from query: $query', ({ query, expected }) => {
    expect(() => LogNode.fromQuery(query, null)).toThrow(expected);
  });
});
