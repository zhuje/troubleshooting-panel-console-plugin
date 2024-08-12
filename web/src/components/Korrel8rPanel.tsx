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
import { Korrel8rTopology } from './Korrel8rTopology';
import './korrel8rpanel.css';
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import { Korrel8rGraphResponse } from '../korrel8r/query.types';
import { LoadingTopology } from './LoadingTopology';
import { TFunction, useTranslation } from 'react-i18next';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useURLState } from '../hooks/useURLState';

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
        {topology(result, t, setQuery)}
      </FlexItem>
    </>
  );
}

const topology = (result: Result, t: TFunction, setQuery: (query: string) => void) => {
  if (result && result.graph && result.graph.nodes && result.graph.edges) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        queryNodes={result.graph.nodes}
        queryEdges={result.graph.edges}
        setQuery={setQuery}
      />
    );
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
