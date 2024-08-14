class GlobalState {
    constructor() {
        this.globalTime = new Date(); // 初始化全局时间
    }

    // 更新全局时间
    updateTime() {
        this.globalTime = new Date();
    }

    getDate() {
        const year = this.globalTime.getFullYear();
        const month = this.globalTime.getMonth() + 1; // 月份从0开始
        const day = this.globalTime.getDate();

        return `${year}-${month}-${day}`;
    }

    getTime() {
        const hour = this.globalTime.getHours();
        const minute = this.globalTime.getMinutes();

        return `${hour}:${minute}`;
    }
}

// 创建全局状态的单例实例
const globalState = new GlobalState();

export default globalState;
