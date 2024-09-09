import axios from "axios";
import frontend_config from "../frontend_config.js";

class Http {
    constructor() {
        this.instance = axios.create({
            baseURL: frontend_config.baseURL,
            timeout: frontend_config.timeout,
        });

        this.instance.interceptors.request.use((config) => {
            return config;
        });
    }

    async post(JWTtoken, path, data) {
        try {
            const headers = this.getAuthHeaders(JWTtoken);
            let result = await this.instance.post(path, data, { headers });
            console.log("POST HTTP 响应：", result.data);
            return result.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async get(JWTtoken, path, params) {
        try {
            const headers = this.getAuthHeaders(JWTtoken);
            let result = await this.instance.get(path, { params, headers });
            return result.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async put(JWTtoken, path, data) {
        try {
            const headers = this.getAuthHeaders(JWTtoken);
            let result = await this.instance.put(path, data, { headers });
            console.log("PUT HTTP 响应：", result.data);
            return result.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async delete(JWTtoken, path) {
        try {
            const headers = this.getAuthHeaders(JWTtoken);
            let result = await this.instance.delete(path, { headers });
            return result;
        } catch (err) {
            this.handleError(err);
        }
    }

    async postWithImage(JWTtoken, path, data) {
        try {
            let formData = new FormData();
            for (let key in data) {
                if (data[key] !== null && data[key] !== undefined) {
                    formData.append(key, data[key]);
                }
            }
            console.log("带图片的POST请求：", formData.entries());
            const headers = {
                ...this.getAuthHeaders(JWTtoken),
                'Content-Type': 'multipart/form-data'
            };
            let result = await this.instance.post(path, formData, { headers });
            return result.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async putWithImage(JWTtoken, path, data) {
        try {
            let formData = new FormData();
            for (let key in data) {
                if (data[key] !== null && data[key] !== undefined && data[key] !== "") {
                    formData.append(key, data[key]);
                }
            }
            console.log("带图片的PUT请求：", formData.entries());
            const headers = {
                ...this.getAuthHeaders(JWTtoken),
                'Content-Type': 'multipart/form-data'
            };
            let result = await this.instance.put(path, formData, { headers });
            return result.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    // 处理 JWT JWTtoken 的传递
    getAuthHeaders(JWTtoken) {
        return JWTtoken ? { Authorization: JWTtoken } : {};
    }

    handleError(err) {
        console.error("HTTP 请求出错：", err.message);
        if (err.response) {
            console.error("响应状态码：", err.response.status);
            console.error("响应数据：", err.response.data);
        }
        throw new Error('无法连接服务器，请检查网络连接。');
    }

    async urlToFile(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        const fileName = url.split('/').pop();
        return new File([blob], fileName, { type: blob.type });
    }
}

export default new Http();
