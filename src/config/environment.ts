type AppEnvironment = 'uat' | 'production';

type AppEnvironmentConfig = {
  name: AppEnvironment;
  apiBaseUrl: string;
  webBaseUrl: string;
  managementBaseUrl: string;
  marketDeepLinkBaseUrl: string;
};

const ENVIRONMENTS: Record<AppEnvironment, AppEnvironmentConfig> = {
  uat: {
    name: 'uat',
    apiBaseUrl: 'https://jonglockapi.zonedevnode.com/api',
    webBaseUrl: 'https://jonglock.zonedevnode.com',
    managementBaseUrl: 'https://jonglockmng.zonedevnode.com',
    marketDeepLinkBaseUrl: 'https://jonglock.zonedevnode.com/market',
  },
  production: {
    name: 'production',
    apiBaseUrl: 'https://api.jonglock.com/api',
    webBaseUrl: 'https://jonglock.com',
    managementBaseUrl: 'https://mng.jonglock.com',
    marketDeepLinkBaseUrl: 'https://jonglock.com/market',
  },
};

const ACTIVE_ENVIRONMENT: AppEnvironment = __DEV__ ? 'uat' : 'production';

export const APP_ENV = ENVIRONMENTS[ACTIVE_ENVIRONMENT];
export const APP_ENVIRONMENTS = ENVIRONMENTS;
