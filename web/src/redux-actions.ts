import { action, ActionType as Action } from 'typesafe-actions';
import { Korrel8rGraphNeighboursResponse } from './korrel8r/query.types';

export enum ActionType {
  CloseTP = 'closeTP',
  OpenTP = 'openTP',
  SetQuery = 'setQuery',
  SetQueryResponse = 'setQueryResponse',
}

export const closeTP = () => action(ActionType.CloseTP);
export const openTP = () => action(ActionType.OpenTP);
export const setQuery = (query: string) => action(ActionType.SetQuery, { query });
export const setQueryResponse = (queryResponse: Korrel8rGraphNeighboursResponse) =>
  action(ActionType.SetQueryResponse, { queryResponse });

const actions = {
  closeTP,
  openTP,
  setQuery,
  setQueryResponse,
};

export type TPAction = Action<typeof actions>;
