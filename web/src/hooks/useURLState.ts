import * as React from 'react';
import { useQueryParams } from './useQueryParams';
import { Korrel8rNodeFactory } from '../korrel8r/node-factory';
import { useLocation } from 'react-router';

export type QueryParams = [string, string][];

export const useURLState = () => {
  const queryParams = useQueryParams();
  const location = useLocation();

  const [allQueryParameters, setAllQueryParameters] = React.useState<QueryParams>(
    getAllQueryParams(queryParams),
  );
  const [korrel8rQueryFromURL, setKorrel8rQueryFromURL] = React.useState<string | undefined>(
    Korrel8rNodeFactory.fromURL((location.pathname + location.search).slice(1))?.toQuery(),
  );

  React.useEffect(() => {
    const allQueryParametersValue = getAllQueryParams(queryParams);
    const korrel8rQueryFromURLValue = Korrel8rNodeFactory.fromURL(
      (location.pathname + location.search).slice(1),
    )?.toQuery();

    setAllQueryParameters(allQueryParametersValue);
    setKorrel8rQueryFromURL(korrel8rQueryFromURLValue);
  }, [queryParams, location.pathname, location.search]);

  return {
    allQueryParameters,
    korrel8rQueryFromURL,
  };
};

export function getAllQueryParams(urlParameters: URLSearchParams): QueryParams {
  const allQueryParams: QueryParams = [];
  urlParameters.forEach((value, key) => {
    allQueryParams.push([key, value]);
  });
  return allQueryParams;
}
