import { getTimePath } from "../filepath.mjs";
import { readJsonFileSync } from "../helper.mjs";
import fs from "fs";
import { syserror } from "../logger.mjs";

class GlobalTime {
    constructor(day = 0, hour = 0, minute = 0) {
      this.day = day;
      this.hour = hour;
      this.minute = minute;
    }

    get value() {
      return {
        day: this.day,
        hour: this.hour,
        minute: this.minute,
      }
    }
  
    static fromJSON(filePath) {
      try {
        const { day, hour, minute } = readJsonFileSync(filePath);
        return new GlobalTime(day, hour, minute);
      } catch (err) {
        syserror("Error reading or parsing JSON file:", err);
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

      this.saveToFile();
    }

    setTime(day, hour, minute) {
      this.day = day;
      this.hour = hour;
      this.minute = minute;

      this.saveToFile();
    }
  
    toString() {
      return `Day ${this.day}, ${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    }

    getCurrentTimestamp() {
      return `${this.day}:${this.hour}:${this.minute}`;
    }

    static parseTimestamp(timestamp) {
      const [day, hour, minute] = timestamp.split(':');
      return {
        day: parseInt(day),
        hour: parseInt(hour),
        minute: parseInt(minute),
      }
    }

    static getExpressiveTime({ day, hour, minute }) {
      return `Day ${day}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    isNewDay() {
      if (this.hour === 0 && this.minute === 0) {
        return true;
      }
      return false;
    }
   
    toJSON() {
      return JSON.stringify({ day: this.day, hour: this.hour, minute: this.minute }, null, 2);
    }
  
    saveToFile(filePath=globalTimePath) {
      try {
        fs.writeFileSync(filePath, this.toJSON(), 'utf8');
      } catch (err) {
        syserror("Error writing to JSON file:", err);
      }
    }

    static isValidTimestamp(timestamp) {
      if (typeof timestamp !== 'string') return false;
      const parts = timestamp.split(':');
      if (parts.length !== 3) return false;
      const [day, hour, minute] = parts.map(Number);
      return (
        !isNaN(day) && day >= 0 &&
        !isNaN(hour) && hour >= 0 && hour < 24 &&
        !isNaN(minute) && minute >= 0 && minute < 60
      );
    }

    static compareTimestamps(timestamp1, timestamp2) {
      if (!this.isValidTimestamp(timestamp1) || !this.isValidTimestamp(timestamp2)) {
        throw new Error('Invalid timestamp format');
      }
      const time1 = this.parseTimestamp(timestamp1);
      const time2 = this.parseTimestamp(timestamp2);
      
      if (time1.day !== time2.day) return time1.day < time2.day ? -1 : 1;
      if (time1.hour !== time2.hour) return time1.hour < time2.hour ? -1 : 1;
      if (time1.minute !== time2.minute) return time1.minute < time2.minute ? -1 : 1;
      return 0;
    }
  }

// 创建全局状态的单例实例
const globalTimePath = getTimePath() + '/global_time.json';
const globalTime = GlobalTime.fromJSON(globalTimePath);

export { globalTime, GlobalTime };
