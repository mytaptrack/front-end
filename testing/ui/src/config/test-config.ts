import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
export interface TestConfig {
  baseUrl: string;
  manageUrl: string;
  browser: 'chrome' | 'firefox' | 'edge';
  headless: boolean;
  timeout: {
    implicit: number;
    explicit: number;
    page: number;
  };
  credentials: {
    testUser: {
      email: Promise<string>;
      password: Promise<string>;
    };
    adminUser: {
      email: Promise<string>;
      password: Promise<string>;
    };
  };
  screenshots: {
    enabled: boolean;
    onFailure: boolean;
    path: string;
  };
}

const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-west-2' });
const STAGE = process.env.STAGE || 'dev';

async function getParamValue(envVariable: string, psName: string, defaultValue: string) {
  if (process.env[envVariable]) {
    return process.env[envVariable];
  }
  const param = await ssm.send(new GetParameterCommand({
    Name: psName
  }));

  process.env[envVariable] = param.Parameter?.Value ?? defaultValue;
  return process.env[envVariable];
}

export const defaultConfig: TestConfig = {
  baseUrl: process.env.BASE_URL || 'https://localhost:8000',
  manageUrl: process.env.MANAGE_URL || 'https://localhost:8001',
  browser: (process.env.BROWSER as 'chrome' | 'firefox' | 'edge') || 'chrome',
  headless: process.env.HEADLESS === 'true',
  timeout: {
    implicit: 10000,
    explicit: 30000,
    page: 60000,
  },
  credentials: {
    testUser: {
      email: getParamValue('TEST_USER_EMAIL', `/${STAGE}/testing/nonadmin/email`, 'NoEmailSet@mytaptrack.com'),
      password: getParamValue('TEST_USER_EMAIL', `/${STAGE}/testing/nonadmin/password`, 'No Password Set'),
    },
    adminUser: {
      email: getParamValue('TEST_USER_EMAIL', `/${STAGE}/testing/admin/email`, 'NoEmailSet@mytaptrack.com'),
      password: getParamValue('TEST_USER_EMAIL', `/${STAGE}/testing/admin/password`, 'No Password Set'),
    },
  },
  screenshots: {
    enabled: process.env.SCREENSHOTS_ENABLED !== 'false',
    onFailure: true,
    path: 'reports/screenshots',
  },
};