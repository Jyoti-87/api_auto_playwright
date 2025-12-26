import { APIRequestContext } from '@playwright/test';

export async function loginApi(
  apiContext: APIRequestContext,
  username: string,
  password: string
) {
  const response = await apiContext.post(
    'https://auth.qa.caret.legal/login',
    {
      form: {
        username,
        password,
      },
    }
  );

  if (response.status() !== 200) {
    throw new Error(`Login failed: ${response.status()}`);
  }

  return await response.json();
}
