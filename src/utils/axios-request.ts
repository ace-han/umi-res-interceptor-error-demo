import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './storage';

type CustomAxiosRequestConfig = AxiosRequestConfig & {
  noAuth?: boolean;
};
const apiClient = axios.create();

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

apiClient.interceptors.request.use((config) => {
  if ('noAuth' in config && config.noAuth) {
    return config;
  }
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequestConfig = error.config as CustomAxiosRequestConfig & {
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
            return apiClient(originalRequestConfig);
          })
          .catch((err) => {
            console.error('retry request error: ', err);
            return Promise.reject(err);
          });
      }
      originalRequestConfig._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        apiClient<API.TokenRefreshResult>('/api/v1/auth/token/refresh', {
          method: 'POST',
        })
          .then((resp) => {
            // console.info('/sso/token/refresh/, resp', resp);
            const { data } = resp;
            setAccessToken(data.access);
            // apiClient.defaults.headers.common['Authorization'] =
            //   'Bearer ' + data.access;
            originalRequestConfig.headers![
              'Authorization'
            ] = `Bearer ${data.access}`;
            processQueue(null, data.access);
            apiClient(originalRequestConfig.url!, originalRequestConfig).then(
              (r) => {
                resolve(r);
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
);

export default apiClient;
