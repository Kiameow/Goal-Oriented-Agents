class GlobalTime {
    constructor(day = 0, hour = 0, minute = 0) {
      this.day = day;
      this.hour = hour;
      this.minute = minute;
    }
  
    static fromJSON(filePath) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const { day, hour, minute } = JSON.parse(data);
        return new GlobalTime(day, hour, minute);
      } catch (err) {
        console.error("Error reading or parsing JSON file:", err);
        return new GlobalTime(); // 如果读取文件失败，返回默认时间
      }
    }
  
    updateTime() {
      this.minute += 10;
  
      if (this.minute >= 60) {
        this.minute = 0;
        this.hour += 1;
      }
  
      if (this.hour >= 24) {
        this.hour = 0;
        this.day += 1;
      }
    }
  
    getCurrentTime() {
      return `Day ${this.day}, ${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    }

    getCurrentDay() {
      return this.day
    }

    getCurrentClockTime() {
      return {
        hour: this.hour,
        minute: this.minute,
      }
    }
   
    toJSON() {
      return JSON.stringify({ day: this.day, hour: this.hour, minute: this.minute }, null, 2);
    }
  
    saveToFile(filePath) {
      try {
        fs.writeFileSync(filePath, this.toJSON(), 'utf8');
      } catch (err) {
        console.error("Error writing to JSON file:", err);
      }
    }
  }

// 创建全局状态的单例实例
const globalTime = new GlobalTime();

export default globalTime;
