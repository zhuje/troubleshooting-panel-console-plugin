import { ClusterIcon } from '@patternfly/react-icons';
import {
  action,
  BreadthFirstLayout,
  ComponentFactory,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeStyle,
  Graph,
  GraphComponent,
  Model,
  ModelKind,
  Node,
  NodeShape,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import * as React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useLocationQuery } from '../../hooks/useLocationQuery';
import { allDomains } from '../../korrel8r/all-domains';
import * as api from '../../korrel8r/client';
import { Node as Korrel8rNode, QueryRef } from '../../korrel8r/types';
import { Search, SearchType } from '../../redux-actions';
import { State } from '../../redux-reducers';
import './korrel8rtopology.css';

interface Korrel8rTopologyNodeProps {
  element: Node;
  onSelect: () => void;
  selected: boolean;
}

type GraphNode = {
  id: string;
  type: string;
  label: string;
  width: number;
  height: number;
  shape: NodeShape;
  data: Korrel8rNode;
};

type GraphEdge = {
  id: string;
  type: string;
  source: string;
  target: string;
  edgeStyle: EdgeStyle;
};

export enum NodeError {
  invalid = 'invalid',
  log = 'log',
  netflow = 'netflow',
}

const Korrel8rTopologyNode: React.FC<Korrel8rTopologyNodeProps> = ({
  element,
  selected,
  onSelect,
}) => {
  if (element.getData().tooltip) {
    return (
      <g opacity="0.7" className="tp-plugin__topology_invalid_node">
        <title>{element.getData().error}</title>
        <DefaultNode element={element} selected={selected} onSelect={onSelect} hover={false}>
          <g transform={`translate(25, 25)`}>
            <ClusterIcon style={{ color: '#393F44' }} width={25} height={25} />
          </g>
        </DefaultNode>
      </g>
    );
  }

  return (
    <DefaultNode element={element} selected={selected} onSelect={onSelect}>
      <g transform={`translate(25, 25)`}>
        <ClusterIcon style={{ color: '#393F44' }} width={25} height={25} />
      </g>
    </DefaultNode>
  );
};

const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withSelection()(Korrel8rTopologyNode);
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
  }
};

const NODE_SHAPE = NodeShape.ellipse;
const NODE_DIAMETER = 75;

const getNodesFromResponse = (
  graph: api.Graph,
  loggingAvailable: boolean,
  netobserveAvailable: boolean,
  t: TFunction,
  persistedSearch: Search,
): Array<GraphNode> => {
  const nodes: Array<GraphNode> = [];
  graph.nodes?.forEach((graphNode: api.Node) => {
    const node = new Korrel8rNode(graphNode, allDomains, persistedSearch.constraint);
    if (node.error) {
      // eslint-disable-next-line no-console
      console.error(node.error);
      node.error = t('Unable to find Console Link');
    } else if (node.class.domain === 'log' && !loggingAvailable) {
      node.error = t('Logging Plugin Disabled');
    } else if (node.class.domain === 'netflow' && !netobserveAvailable) {
      node.error = t('Netflow Plugin Disabled');
    }
    nodes.push({
      id: node.classStr, // Original class string is always unique in a graph.
      type: 'node',
      label: `${nodeLabel(node)} (${node.count})`,
      width: NODE_DIAMETER,
      height: NODE_DIAMETER,
      shape: NODE_SHAPE,
      data: node,
    });
  });
  return nodes;
};

const nodeLabel = (node: Korrel8rNode): string => {
  const c = node.class;
  switch (c?.domain) {
    case 'k8s':
      return c?.name?.split('.')?.[0] || node.classStr;
    case 'log':
      return c?.name ? capitalize(c.name) + ' Logs' : node.classStr;
    default:
      return c?.domain ? capitalize(c.domain) : node.classStr;
  }
};

const capitalize = (s: string) => {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
};

const getEdgesFromResponse = (graph: api.Graph): Array<GraphEdge> => {
  const edges: Array<GraphEdge> = [];

  graph.edges?.forEach((edge: api.Edge) => {
    const start = graph.nodes.find((node: api.Node) => node.class === edge.start);
    const goal = graph.nodes.find((node: api.Node) => node.class === edge.goal);
    if (!start || !goal) return;
    edges.push({
      id: `edge-${edge.start}-${edge.goal}`,
      type: 'edge',
      source: edge.start,
      target: edge.goal,
      edgeStyle: EdgeStyle.default,
    });
  });
  return edges;
};

export const Korrel8rTopology: React.FC<{
  graph: api.Graph;
  loggingAvailable: boolean;
  netobserveAvailable: boolean;
  setSearch: (search: Search) => void;
}> = ({ graph, loggingAvailable, netobserveAvailable, setSearch }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const locationQuery = useLocationQuery();
  const navigate = useNavigate();
  const persistedSearch = useSelector((state: State) => {
    return state.plugins?.tp?.get('persistedSearch');
  }) as Search;

  const nodes = React.useMemo(
    () => getNodesFromResponse(graph, loggingAvailable, netobserveAvailable, t, persistedSearch),
    [graph, loggingAvailable, netobserveAvailable, t, persistedSearch],
  );

  const edges = React.useMemo(() => getEdgesFromResponse(graph), [graph]);

  const selectedIds = React.useMemo(() => {
    return nodes
      .filter((node) => {
        try {
          // This is less efficient, but there are certain plugins which add query params
          // to the URL that we don't want to match on
          // TODO - is this still necessary?
          return node.data.queries.find((qr: QueryRef) => qr.query == locationQuery);
        } catch (e) {
          return false;
        }
      })
      .map((node) => node.id);
  }, [nodes, locationQuery]);

  const selectionAction = React.useCallback(
    (selected: Array<string>) => {
      const newlySelectedNode = selected.find(
        (eachSelection) => !selectedIds.includes(eachSelection),
      );
      if (!newlySelectedNode) {
        return;
      }
      const node = nodes.find((node) => node.id.startsWith(newlySelectedNode));
      if (!node || node.data.error) {
        return;
      }
      const korrel8rNode = node?.data;
      if (!korrel8rNode) {
        return;
      }
      const qc = node.data.queries?.[0];
      if (!qc?.link) return;
      setSearch({
        queryStr: qc.query.toString(),
        type: SearchType.Neighbour,
        depth: 3,
        goal: null,
        constraint: persistedSearch.constraint,
      });
      navigate('/' + qc.link.toString());
    },
    [navigate, nodes, selectedIds, setSearch, persistedSearch],
  );

  const controller = React.useMemo(() => {
    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'korrel8r_graph',
        type: 'graph',
        layout: 'BreadthFirst',
      },
    };

    const newController = new Visualization();
    newController.registerLayoutFactory((_, graph: Graph) => new BreadthFirstLayout(graph));
    newController.registerComponentFactory(baselineComponentFactory);

    newController.fromModel(model, false);
    return newController;
  }, [nodes, edges]);

  const eventController = React.useMemo(() => {
    controller.addEventListener(SELECTION_EVENT, selectionAction);
    setTimeout(() => {
      // Center the graph on the next render tick once the graph elements have been sized and placed
      controller.getGraph().fit(30);
    }, 100); // FIXME this timeout is racy, need to reliably centre graph after layout is done.
    return controller;
  }, [controller, selectionAction]);

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: action(() => {
              controller.getGraph().scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              controller.getGraph().scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              controller.getGraph().fit(30);
            }),
            resetViewCallback: action(() => {
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationProvider controller={eventController}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};
