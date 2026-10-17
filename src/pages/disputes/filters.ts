import type { DisputeFilterState } from './components/DisputeFilters';

export const DEFAULT_FILTERS: DisputeFilterState = {
  search: '',
  status: '',
  role: '',
  category: '',
  project: '',
  actionRequired: false,
  dateOpened: '',
};
