import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import * as React from 'react';

import { useSelector } from 'react-redux';
import Popover from '../components/Popover';
import { State } from '../redux-reducers';

const usePopover = () => {
  const isOpen = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));

  const launchModal = useModal();

  React.useEffect(() => {
    if (launchModal && isOpen) {
      launchModal?.(
        Popover,
        { title: 'troubleshooting-panel-console-plugin-modal' },
        'id-troubleshooting-panel-console-plugin-modal',
      );
    }
  }, [launchModal, isOpen]);

  return [];
};

export default usePopover;
