import { LocalStorage } from "node-localstorage";

const USER_KEY = "SA_USER_KEY";
const TOKEN_KEY = "SA_TOKEN_KEY";

// 创建一个存储位置，可以是项目中的某个目录
const localStorage = new LocalStorage('./scratch');

class AuthStore {
  constructor() {
    this._user = JSON.parse(localStorage.getItem(USER_KEY)) || {};
    this._token = localStorage.getItem(TOKEN_KEY) || "";
  }

  setUserToken(user, token) {
    this._user = user;
    this._token = token;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearUserToken() {
    this._user = {};
    this._token = "";
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  get user() {
    if (Object.keys(this._user).length === 0) {
      let user_str = localStorage.getItem(USER_KEY);
      if (user_str) {
        this._user = JSON.parse(user_str);
      }
    }
    return this._user;
  }

  get token() {
    if (!this._token) {
      let token_str = localStorage.getItem(TOKEN_KEY);
      if (token_str) {
        this._token = token_str;
      }
    }
    return this._token;
  }

  get is_logined() {
    return Object.keys(this.user).length > 0 && this.token;
  }
}

const authStore = new AuthStore();
export default authStore;