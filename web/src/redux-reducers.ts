import { Map as ImmutableMap } from 'immutable';

import { ActionType, TPAction } from './redux-actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TPState = ImmutableMap<string, any>;

export type State = {
  plugins: {
    tp: TPState;
  };
};

const reducer = (state: TPState, action: TPAction): TPState => {
  if (!state) {
    return ImmutableMap({
      isOpen: true,
      query: '',
      queryResponse: {
        nodes: [],
        edges: [],
      },
    });
  }

  switch (action.type) {
    case ActionType.CloseTP:
      return state.set('isOpen', false);

    case ActionType.OpenTP:
      return state.set('isOpen', true);

    case ActionType.SetQuery:
      return state.set('query', action.payload.query);
    case ActionType.SetQueryResponse:
      return state.set('queryResponse', {
        nodes: [...action.payload.queryResponse.nodes],
        edges: [...action.payload.queryResponse.edges],
      });

    default:
      break;
  }
  return state;
};

export default reducer;
