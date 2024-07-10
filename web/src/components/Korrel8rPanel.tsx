import * as React from 'react';
import {
  Button,
  TextArea,
  TextInputGroup,
  Title,
  FlexItem,
  EmptyStateHeader,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { Korrel8rTopology } from './Korrel8rTopology';
import './korrel8rpanel.css';
import { getNeighborsGraph } from '../korrel8r-client';
import { Korrel8rGraphNeighboursResponse } from '../korrel8r/query.types';
import { LoadingTopology } from './LoadingTopology';
import { TFunction, useTranslation } from 'react-i18next';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useURLState } from '../hooks/useURLState';

type Result = {
  graph?: Korrel8rGraphNeighboursResponse;
  message?: string;
  title?: string;
};

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');

  // State
  const { korrel8rQueryFromURL } = useURLState();
  const [query, setQuery] = React.useState(korrel8rQueryFromURL);
  const [result, setResult] = React.useState<Result | null>(null);

  React.useEffect(() => {
    // Set result = null to trigger a reload, don't run the query till then.
    if (result !== null) {
      return;
    }
    const { request, abort } = getNeighborsGraph({ query });
    request()
      .then((response) => {
        setResult({ graph: { nodes: response.nodes, edges: response.edges } });
      })
      .catch((e) => {
        try {
          setResult({ message: JSON.parse(e.message).error, title: t('Korrel8r Error') });
        } catch {
          setResult({ message: e.message, title: t('Error Loading Data') });
        }
      });
    return abort;
  }, [result, query, t]);

  return (
    <>
      <FlexItem className="tp-plugin__panel-query-container">
        <Title headingLevel="h2">{t('Correlation Signals')}</Title>
        <TextInputGroup className="tp-plugin__panel-query-input">
          <TextArea
            type="text"
            id="queryString"
            name="queryString"
            value={query}
            autoResize
            onChange={(_event, value) => setQuery(value)}
          />
        </TextInputGroup>
        <Button
          isAriaDisabled={!query || !result} // Disabled during loading.
          onClick={() => {
            setResult(null);
          }}
        >
          Query
        </Button>
      </FlexItem>
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        {topology(result, t)}
      </FlexItem>
    </>
  );
}

const topology = (result: Result, t: TFunction) => {
  if (result && result.graph && result.graph.nodes && result.graph.edges) {
    // Non-empty graph
    return <Korrel8rTopology queryNodes={result.graph.nodes} queryEdges={result.graph.edges} />;
  }

  let info: React.ReactNode;
  if (result === null) {
    info = <Loading />;
  } else if (result.message) {
    info = <TopologyInfoState titleText={result.title} text={result.message} isError={true} />;
  } else {
    info = (
      <TopologyInfoState
        titleText={t('No Correlated Signals Found')}
        text={t('Correlation result was empty.')}
        isError={false}
      />
    );
  }
  return (
    <>
      <div className="tp-plugin__panel-topology-info">{info}</div>
      <LoadingTopology />
    </>
  );
};

const Loading: React.FC = () => (
  <div className={'co-m-loader co-an-fade-in-out tp-plugin__panel-topology-info'}>
    <div className="co-m-loader-dot__one" />
    <div className="co-m-loader-dot__two" />
    <div className="co-m-loader-dot__three" />
  </div>
);

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FunctionComponent<TopologyInfoStateProps> = ({
  titleText,
  text,
  isError,
}) => {
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={titleText}
          headingLevel="h4"
          icon={
            <EmptyStateIcon
              icon={isError ? ExclamationCircleIcon : CubesIcon}
              color={isError ? 'var(--pf-v5-global--danger-color--100)' : ''}
            />
          }
        />
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};
