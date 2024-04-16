import * as React from 'react';
import { useBoolean } from './useBoolean';

export const usePluginAvailable = (pluginName: string): boolean => {
  const [isPluginAvailable, togglePluginAvailable] = useBoolean(false);

  React.useEffect(() => {
    fetch(`/api/plugins/${pluginName}/plugin-manifest.json`).then(
      (response) => response.status === 200 && togglePluginAvailable(),
    );
  }, [togglePluginAvailable, pluginName]);

  return isPluginAvailable;
};
