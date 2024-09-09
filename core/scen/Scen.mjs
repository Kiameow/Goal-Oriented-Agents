// [
//     {
//         "id": "MLH",
//         "name": "Maria Lopez's Home",
//         "description": "Where Maria Lopez rest"
//     },

import { getScenPath } from "../../filepath.mjs";
import fs from "fs";
import { syserror } from "../../logger.mjs";

// ]
class Scen {
    constructor(locationsInfo = []) {
        this.locations = locationsInfo;
        this.agentsDistribution = locationsInfo.reduce((acc, obj) => {
            acc.set(obj.id, []); // 将每个键的值初始化为一个空数组
            return acc;
          }, new Map());
    }

    // 读取场景文件
    static fromJson(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const locationsArr = JSON.parse(data);
            return new Scen(locationsArr)
          } catch (err) {
            syserror("Error reading or parsing JSON file:", err);
            return new Scen(); // 如果读取文件失败，返回一个空场景
          }
    }

    // 更新某个agent的位置
    updateAgentLocation(agentID, locationID) {
        if (locationID)
        this.agentsDistribution.set(locationID, [...this.agentsDistribution.get(locationID), agentID]);
    }
}

const scenPath = getScenPath() + "/locations.json";
const globalScen = Scen.fromJson(scenPath);
export { Scen, globalScen };