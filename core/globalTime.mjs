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
  
    updateTime(span = 10) {
      const totalMinutes = this.minute + span;
  
      // Update the minute by taking the remainder after dividing by 60
      this.minute = totalMinutes % 60;
      
      // Calculate the additional hours from the overflowed minutes
      const additionalHours = Math.floor(totalMinutes / 60);
      this.hour += additionalHours;
      
      // Update the hour by taking the remainder after dividing by 24
      if (this.hour >= 24) {
        this.day += Math.floor(this.hour / 24); // Calculate additional days from overflowed hours
        this.hour = this.hour % 24;
      }
    }

    setTime(day, hour, minute) {
      this.day = day;
      this.hour = hour;
      this.minute = minute;
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
