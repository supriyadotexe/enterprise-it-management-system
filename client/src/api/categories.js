import { compactParams, request } from './client.js';

function categoryApi(basePath) {
  return {
    list: (params = {}) =>
      request({ method: 'get', url: basePath, params: compactParams(params) }),
    create: (payload) => request({ method: 'post', url: basePath, data: payload }),
    update: (id, payload) =>
      request({ method: 'patch', url: `${basePath}/${id}`, data: payload }),
  };
}

export const assetCategoriesApi = categoryApi('/asset-categories');
export const serviceCategoriesApi = categoryApi('/service-categories');
