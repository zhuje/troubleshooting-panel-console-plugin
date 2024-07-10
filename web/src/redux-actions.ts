import { action, ActionType as Action } from 'typesafe-actions';

export enum ActionType {
  CloseTP = 'closeTP',
  OpenTP = 'openTP',
}

export const closeTP = () => action(ActionType.CloseTP);
export const openTP = () => action(ActionType.OpenTP);

const actions = {
  closeTP,
  openTP,
};

export type TPAction = Action<typeof actions>;
