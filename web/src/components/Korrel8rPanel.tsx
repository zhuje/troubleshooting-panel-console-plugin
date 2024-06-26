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
import { useDispatch, useSelector } from 'react-redux';
import { setQueryResponse, setQuery } from '../redux-actions';
import { State } from '../redux-reducers';
import { Korrel8rGraphNeighboursResponse } from '../korrel8r/query.types';
import { LoadingTopology } from './LoadingTopology';
import { useTranslation } from 'react-i18next';
import { useBoolean } from '../hooks/useBoolean';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { usePluginAvailable } from '../hooks/usePluginAvailable';

interface Korrel8rPanelProps {
  initialQueryString: string;
}

export default function Korrel8rPanel({ initialQueryString }: Korrel8rPanelProps) {
  const [queryString, setQueryString] = React.useState(initialQueryString);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [errorMessageTitle, setErrorMessageTitle] = React.useState('');
  const [isLoading, , setLoadingTrue, setLoadingFalse] = useBoolean(false);
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const netobserveAvailable = usePluginAvailable('netobserv-plugin');
  const loggingAvailable = usePluginAvailable('logging-view-plugin');

  const dispatch = useDispatch();
  const query: string = useSelector((state: State) => state.plugins?.tp?.get('query'));
  const queryResponse: Korrel8rGraphNeighboursResponse = useSelector((state: State) =>
    state.plugins?.tp?.get('queryResponse'),
  );

  if (!query && queryString) {
    dispatch(setQuery(queryString));
  }

  React.useEffect(() => {
    if (!query) {
      return;
    }
    setLoadingTrue();
    const { request, abort } = getNeighborsGraph({ query });
    request()
      .then((response) => {
        let existingNodes = response.nodes.filter((node) => {
          return (
            node.count > 0 &&
            (netobserveAvailable || !node.class.startsWith('netflow')) &&
            (loggingAvailable || !node.class.startsWith('log'))
          );
        });
        existingNodes = existingNodes.map((node) => {
          return {
            class: node.class,
            count: node.count,
            queries: node.queries.filter((query) => query.count > 0),
          };
        });
        const existingNodeNames = existingNodes.map((node) => node.class);
        const existingEdges = response.edges
          ? response.edges.filter(
              (edge) =>
                existingNodeNames.includes(edge.start) && existingNodeNames.includes(edge.goal),
            )
          : [];
        dispatch(
          setQueryResponse({
            nodes: existingNodes,
            edges: existingEdges,
          }),
        );
        setLoadingFalse();
        setErrorMessage('');
        setErrorMessageTitle('');
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        setLoadingFalse();
        let displayError: string;
        try {
          displayError = JSON.parse(error.message).error;
          setErrorMessageTitle(t('Korrel8r Error'));
        } catch (e) {
          displayError = error.message;
          setErrorMessageTitle(t('Error Loading Data'));
        }
        setErrorMessage(displayError);
      });
    return () => {
      abort();
    };
  }, [query, dispatch, setLoadingFalse, setLoadingTrue, loggingAvailable, netobserveAvailable, t]);

  return (
    <>
      <FlexItem className="tp-plugin__panel-query-container">
        <Title headingLevel="h2">{t('Correlation Signals')}</Title>
        <TextInputGroup className="tp-plugin__panel-query-input">
          <TextArea
            type="text"
            id="queryString"
            name="queryString"
            value={queryString}
            autoResize
            onChange={(_event, value) => setQueryString(value)}
          />
        </TextInputGroup>
        <Button
          isAriaDisabled={!queryString}
          onClick={() => {
            dispatch(setQueryResponse({ nodes: [], edges: [] }));
            dispatch(setQuery(queryString));
          }}
        >
          Query
        </Button>
      </FlexItem>
      <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
        {queryResponse.nodes.length > 0 && queryResponse.edges.length > 0 ? (
          <Korrel8rTopology queryNodes={queryResponse.nodes} queryEdges={queryResponse.edges} />
        ) : (
          <>
            {isLoading ? (
              <Loading />
            ) : (
              <div className="tp-plugin__panel-topology-info">
                {errorMessage ? (
                  <TopologyInfoState titleText={errorMessageTitle} text={errorMessage} isError />
                ) : (
                  <TopologyInfoState
                    titleText={t('No Correlation Signals Found')}
                    text={t(
                      'No correlation signals were found for the given query. Please try a different query.',
                    )}
                  />
                )}
              </div>
            )}
            <LoadingTopology />
          </>
        )}
      </FlexItem>
    </>
  );
}

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
  );
};
