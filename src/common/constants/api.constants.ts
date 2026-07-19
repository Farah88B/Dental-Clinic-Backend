
export const API = {
  PREFIX: 'api',
  DEFAULT_VERSION: '1',
  SWAGGER_PATH: 'docs',
  HEALTH_PATH: 'health',
} as const;

export const API_ERROR_CODES = {
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;