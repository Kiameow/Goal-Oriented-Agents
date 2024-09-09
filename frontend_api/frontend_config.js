import dotenv from 'dotenv';

dotenv.config();

const frontend_config = {
    baseURL: process.env.VITE_BASE_URL,
    timeout: process.env.VITE_TIMEOUT,
};

export default frontend_config;