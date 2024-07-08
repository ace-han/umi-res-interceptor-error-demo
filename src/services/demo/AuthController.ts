import axiosClient from '@/utils/axios-request';
import { request } from '@umijs/max';

export async function getUserInfoViaUmi(params: Record<string, any> = {}) {
  return request<API.AuthUserResult>('/api/v1/auth/user', {
    method: 'GET',
    params: { ...params, client: 'umi' },
  });
}

export async function getUserInfoViaAxios(params: Record<string, any> = {}) {
  return axiosClient<API.AuthUserResult>('/api/v1/auth/user', {
    method: 'GET',
    params: { ...params, client: 'axios' },
  }).then((res) => res.data);
}
