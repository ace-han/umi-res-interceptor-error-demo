import { AxiosError, RequestConfig, request } from '@umijs/max';
import { clearAccessToken, getAccessToken, setAccessToken } from './storage';

let isRefreshing = false;
let failedRequestsQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedRequestsQueue = [];
};

const triggerLoginHandler = () => {
  // do your redirect login
  // open a modal for confirm dialog
  const currentUrl = `${window.location.pathname}?${window.location.search}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
  window.location.assign(loginUrl);
};

export default {
  requestInterceptors: [
    (url, options) => {
      // umi-request style here, options => axios `config`
      if (options.noAuth) {
        return { url, options };
      }
      const token = getAccessToken();
      if (token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      return { url, options };
    },
  ],
  responseInterceptors: [
    [
      (response) => {
        // response.status != 2xx will not get here
        // retry 401 request here, so that the original request invoker can get back the retry result
        // response: AxiosResponse
        // console.info('responseInterceptors, response', response);
        return response;
      },
      (error: AxiosError) => {
        // due to umijs/max hijack axios intercept
        console.error('responseInterceptors, error', error);
        const originalRequestConfig = error.config as RequestConfig & {
          _retry?: boolean;
        };
        if (error.response?.status === 401 && !originalRequestConfig._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedRequestsQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequestConfig.headers![
                  'Authorization'
                ] = `Bearer  ${token}`;
                return request(
                  originalRequestConfig.url!,
                  originalRequestConfig,
                );
              })
              .catch((err) => {
                console.error('retry request error: ', err);
                return Promise.reject(err);
              });
          }
          originalRequestConfig._retry = true;
          isRefreshing = true;

          return new Promise<any>((resolve, reject) => {
            request<API.TokenRefreshResult>('/api/v1/auth/token/refresh', {
              method: 'POST',
              noAuth: true, // skip access_token requestInterceptors
              _retry: true, // skill any responseInterceptors and redirect to login page on catch block
            })
              .then((resp) => {
                // console.info('/sso/token/refresh/, resp', resp);
                setAccessToken(resp.access);
                // apiClient.defaults.headers.common['Authorization'] =
                //   'Bearer ' + data.access;
                originalRequestConfig.headers![
                  'Authorization'
                ] = `Bearer ${resp.access}`;
                processQueue(null, resp.access);
                request(originalRequestConfig.url!, originalRequestConfig).then(
                  (r) => {
                    resolve({ data: r });
                  },
                );
              })
              .catch((err) => {
                processQueue(err, null);
                clearAccessToken();
                triggerLoginHandler();
                reject(err);
              })
              .finally(() => {
                isRefreshing = false;
              });
          });
        }
        return Promise.reject(error);
      },
    ],
  ],
} as RequestConfig;
