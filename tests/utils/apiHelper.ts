import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
  readonly apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  async post(url: string, data: any, headers?: any) {
    return await this.apiContext.post(url, { data, headers });
  }

  async get(url: string, headers?: any) {
    return await this.apiContext.get(url, { headers });
  }
}
