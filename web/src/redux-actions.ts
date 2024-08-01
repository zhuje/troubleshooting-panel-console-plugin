import { action, ActionType as Action } from 'typesafe-actions';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
}

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);

const actions = {
  closeTP,
  openTP,
};

export type TPAction = Action<typeof actions>;
