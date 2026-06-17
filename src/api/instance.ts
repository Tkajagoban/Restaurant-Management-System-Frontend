import axios from "axios";

const BASE_URL = 'http://13.60.206.192:8089/api/v1/';
//const BASE_URL = 'http://localhost:8089/api/v1/';

const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
});

instance.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData to allow browser to set boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, error => {
  return Promise.reject(error);
});

/**
 * logout section
 */

export const postLogout = async (): Promise<void> => {
  try {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
    if (!token) throw new Error('No token found');

    await instance.post(
      'auth/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // Clear session storage
    sessionStorage.clear();
    window.location.href = '/'; // redirect to login/home
  } catch (error: any) {
    console.error('Logout failed', error);
    alert('Logout failed: ' + (error.response?.data?.statusMessage || error.message));
  }
};

instance.interceptors.response.use(
  response => {
    console.log(`[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  error => {
    if (error.response) {
      console.error(`[API Error] ${error.response.status} ${error.config.method?.toUpperCase()} ${error.config.url}`, {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else {
      console.error('[API Error] No response received:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance;