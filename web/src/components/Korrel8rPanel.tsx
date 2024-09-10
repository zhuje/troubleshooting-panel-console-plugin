import * as React from 'react';
import { CancellableFetch } from '../cancellable-fetch';
import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  NumberInput,
  Radio,
  TextArea,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Korrel8rTopology } from './topology/Korrel8rTopology';
import './korrel8rpanel.css';
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import { Korrel8rGraphResponse } from '../korrel8r/query.types';
import { LoadingTopology } from './topology/LoadingTopology';
import { TFunction, useTranslation } from 'react-i18next';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useURLState } from '../hooks/useURLState';
import { usePluginAvailable } from '../hooks/usePluginAvailable';

type Result = {
  graph?: Korrel8rGraphResponse;
  message?: string;
  title?: string;
};
enum QueryType {
  Neighbour,
  Goal,
}

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');

  // State
  const { korrel8rQueryFromURL } = useURLState();
  const [query, setQuery] = React.useState(korrel8rQueryFromURL); // Initial value from URL
  const [result, setResult] = React.useState<Result | null>(null);
  const [showQuery, setShowQuery] = React.useState(false);
  const [queryType, setQueryType] = React.useState(QueryType.Neighbour);
  const [depth, setDepth] = React.useState(3);
  const [goal, setGoal] = React.useState('');

  React.useEffect(() => {
    // Set result = null to trigger a reload, don't run the query till then.
    if (result !== null) {
      return;
    }
    let fetch: CancellableFetch<Korrel8rGraphResponse>;
    if (queryType === QueryType.Neighbour) {
      fetch = getNeighborsGraph({ query }, depth);
    } else if (queryType === QueryType.Goal) {
      fetch = getGoalsGraph({ query }, goal);
    } else {
      return;
    }
    const { request, abort } = fetch;
    request()
      .then((response: Korrel8rGraphResponse) => {
        setResult({ graph: { nodes: response.nodes, edges: response.edges } });
      })
      .catch((e: Error) => {
        try {
          setResult({ message: JSON.parse(e.message).error, title: t('Korrel8r Error') });
        } catch {
          setResult({ message: e.message, title: t('Error Loading Data') });
        }
      });
    return abort;
  }, [result, query, depth, goal, queryType, t]);

  const queryToggleID = 'query-toggle';
  const queryContentID = 'query-content';
  const queryInputID = 'query-input';
  const queryTypeOptions = 'query-type-options';

  const cannotFocus = t(
    'The current console page does not show resources that are supported for correlation.',
  );
  const focusTip = korrel8rQueryFromURL
    ? t('Re-calculate the correlation graph starting from resources on the current console page.')
    : cannotFocus;
  const minDepth = 1;
  const maxDepth = 10;
  const runQuery = () => {
    if (!goal) setQueryType(QueryType.Neighbour); // If no goal do neighbours.
    if (!depth || depth < minDepth) setDepth(minDepth); // Min valid value is 1
    if (depth && depth > maxDepth) setDepth(maxDepth); // Max value
    setResult(null);
  };

  return (
    <>
      <Flex className="tp-plugin__panel-query-container">
        <Tooltip content={focusTip}>
          <Button
            isAriaDisabled={!korrel8rQueryFromURL}
            onClick={() => {
              setQuery(korrel8rQueryFromURL);
              runQuery();
            }}
          >
            {t('Focus')}
          </Button>
        </Tooltip>
        <FlexItem align={{ default: 'alignRight' }}>
          <ExpandableSectionToggle
            contentId={queryContentID}
            toggleId={queryToggleID}
            isExpanded={showQuery}
            onToggle={(on: boolean) => setShowQuery(on)}
          >
            {showQuery ? t('Hide Query') : t('Show Query')}
          </ExpandableSectionToggle>
        </FlexItem>
      </Flex>
      <ExpandableSection
        contentId={queryContentID}
        toggleId={queryToggleID}
        isExpanded={showQuery}
        isDetached
        isIndented
      >
        <Flex direction={{ default: 'column' }}>
          <Tooltip content={t('Korrel8 query selecting the starting points for correlation.')}>
            <TextArea
              className="tp-plugin__panel-query-input"
              placeholder="domain:class:querydata"
              id={queryInputID}
              value={query}
              onChange={(_event, value) => setQuery(value)}
              resizeOrientation="vertical"
            />
          </Tooltip>
          <Flex>
            <Tooltip content={t('Show graph of connected classes up to the specified depth.')}>
              <Radio
                label={t('Neighbourhood depth: ')}
                name={queryTypeOptions}
                id="neighbourhood-option"
                isChecked={queryType === QueryType.Neighbour}
                onChange={(_: React.FormEvent, on: boolean) => {
                  on && setQueryType(QueryType.Neighbour);
                }}
              />
            </Tooltip>
            <NumberInput
              value={depth}
              min={minDepth}
              max={maxDepth}
              isDisabled={queryType !== QueryType.Neighbour}
              onPlus={() => setDepth((depth || 0) + 1)}
              onMinus={() => (depth || 0) > minDepth && setDepth(depth - 1)}
              onChange={(event: React.FormEvent<HTMLInputElement>) => {
                const n = Number((event.target as HTMLInputElement).value);
                setDepth(isNaN(n) ? 1 : n);
              }}
            />
          </Flex>
          <Flex>
            <Tooltip content={t('Show graph of paths to signals of the specified class.')}>
              <Radio
                label={t('Goal class: ')}
                name={queryTypeOptions}
                id="goal-option"
                isChecked={queryType === QueryType.Goal}
                onChange={(_: React.FormEvent, on: boolean) => on && setQueryType(QueryType.Goal)}
              />
            </Tooltip>
            <FlexItem>
              <TextInput
                value={goal}
                isDisabled={queryType !== QueryType.Goal}
                placeholder="domain:class"
                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                  setGoal((event.target as HTMLInputElement).value);
                }}
                aria-label="Korrel8r Query"
              />
            </FlexItem>
          </Flex>
        </Flex>
        <Button isAriaDisabled={!query} onClick={() => runQuery()} variant="secondary">
          {t('Query')}
        </Button>
      </ExpandableSection>
      <Divider />
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        <Topology result={result} t={t} setQuery={setQuery} />
      </FlexItem>
    </>
  );
}

interface TopologyProps {
  result?: Result;
  t: TFunction;
  setQuery: (query: string) => void;
}

const Topology: React.FC<TopologyProps> = ({ result, t, setQuery }) => {
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (!result || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Loading />;
  }

  if (result.graph && result.graph.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        queryNodes={result.graph.nodes || []}
        queryEdges={result.graph.edges || []}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        setQuery={setQuery}
      />
    );
  }

  if (result.message) {
    // Error returned from korrel8r
    return (
      <TopologyInfoState
        titleText={result.title}
        // Only display fisrt 400 characters of error to prevent repeating errors
        text={result.message.slice(0, 400)}
        isError={true}
      />
    );
  }

  return (
    <TopologyInfoState
      titleText={t('No Correlated Signals Found')}
      text={t('Correlation result was empty.')}
      isError={false}
    />
  );
};

const Loading: React.FC = () => (
  <>
    <div className="tp-plugin__panel-topology-info">
      <div className={'co-m-loader co-an-fade-in-out tp-plugin__panel-topology-info'}>
        <div className="co-m-loader-dot__one" />
        <div className="co-m-loader-dot__two" />
        <div className="co-m-loader-dot__three" />
      </div>
    </div>
    <LoadingTopology />
  </>
);

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FC<TopologyInfoStateProps> = ({ titleText, text, isError }) => {
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
