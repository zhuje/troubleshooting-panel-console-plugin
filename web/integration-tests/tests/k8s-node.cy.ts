import { K8sNode } from '../../src/korrel8r/k8s';

/**
 * Bad deployment is the suggested deployment from korrel8r to show its functionality within the
 * logging plugin. https://korrel8r.github.io/korrel8r/#troubleshooting-no-related-logs
 *
 */
describe('Test K8sNode Parsing', () => {
  beforeEach(() => {
    const resources = {
      consoleVersion: 'x.y.z',
      models: [
        {
          kind: 'Pod',
          apiVersion: 'v1',
          path: 'pods',
          verbs: ['watch'],
        },
      ],
    };
    localStorage.setItem('bridge/api-discovery-resources', JSON.stringify(resources));
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const windowWithFlags = window as any;
    windowWithFlags.SERVER_FLAGS = { consoleVersion: 'x.y.z' };
  });

  it('Test url to query parsing', () => {
    const url = 'k8s/ns/default/pods/bad-deployment-000000000-00000';
    const expectedKorrel8rQuery =
      'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}';
    expect(K8sNode.fromURL(url)?.toQuery()).to.equal(expectedKorrel8rQuery);

    const eventUrl = 'k8s/ns/default/pods/bad-deployment-000000000-00000/events';
    const eventExpectedKorrel8rQuery =
      'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}';
    expect(K8sNode.fromURL(eventUrl)?.toQuery()).to.equal(eventExpectedKorrel8rQuery);
  });

  it('Test query to url parsing', () => {
    const query = 'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}';
    const expectedKorrel8rURL = 'k8s/ns/default/pods/bad-deployment-000000000-00000';
    expect(K8sNode.fromQuery(query)?.toURL()).to.equal(expectedKorrel8rURL);

    const eventQuery =
      'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}';
    const eventExpectedKorrel8rURL = 'k8s/ns/default/pods/bad-deployment-000000000-00000/events';
    expect(K8sNode.fromQuery(eventQuery)?.toURL()).to.equal(eventExpectedKorrel8rURL);
  });

  it('Query => URL => Query', () => {
    const query = 'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}';
    const expectedKorrel8rURL = 'k8s/ns/default/pods/bad-deployment-000000000-00000';
    const actualKorrel8rURL = K8sNode.fromQuery(query)?.toURL();
    expect(actualKorrel8rURL).to.equal(expectedKorrel8rURL);
    expect(K8sNode.fromURL(actualKorrel8rURL)?.toQuery()).to.equal(query);

    const eventQuery =
      'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}';
    const eventExpectedKorrel8rURL = 'k8s/ns/default/pods/bad-deployment-000000000-00000/events';
    const actualEventKorrel8rURL = K8sNode.fromQuery(eventQuery)?.toURL();
    expect(actualEventKorrel8rURL).to.equal(eventExpectedKorrel8rURL);
    expect(K8sNode.fromURL(actualEventKorrel8rURL)?.toQuery()).to.equal(eventQuery);
  });

  it('URL => Query => URL', () => {
    const url = 'k8s/ns/default/pods/bad-deployment-000000000-00000';
    const expectedQuery =
      'k8s:Pod.v1.:{"namespace":"default","name":"bad-deployment-000000000-00000"}';
    const actualQuery = K8sNode.fromURL(url)?.toQuery();
    expect(actualQuery).to.equal(expectedQuery);
    expect(K8sNode.fromQuery(expectedQuery)?.toURL()).to.equal(url);

    const eventUrl = 'k8s/ns/default/pods/bad-deployment-000000000-00000/events';
    const eventExpectedQuery =
      'k8s:Event.v1.:{"fields":{"involvedObject.namespace":"default","involvedObject.name":"bad-deployment-000000000-00000","involvedObject.apiVersion":"v1","involvedObject.kind":"Pod"}}';
    const actualEventQuery = K8sNode.fromURL(eventUrl)?.toQuery();
    expect(actualEventQuery).to.equal(eventExpectedQuery);
    expect(K8sNode.fromQuery(actualEventQuery)?.toURL()).to.equal(eventUrl);
  });
});
