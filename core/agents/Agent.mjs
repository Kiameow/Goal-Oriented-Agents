// {
//     "name": "Maria Lopez",
//     "age": "23",
//     "gender": "male",
//     "personality": "energetic, enthusiastic, inquisitive",
//     "learned": "Maria Lopez is a student at Oak Hill College studying physics and a part time Twitch game streamer who loves to connect with people and explore new ideas.",
//     "role": "student",
//     "memoryLocation": "./memeories/MariaLopezMemory.json",
//     "initialLocation": "Maria Lopez's Home",
//     "lifestyle": "Maria Lopez goes to bed around 2am, awakes up around 9am, eats dinner around 6pm. She likes to hang out at Hobbs Cafe if it is before 6pm.",
//     "wakeHour": "9am"
// }

import { extractContentBetweenFlags } from "../../helper.mjs";
import globalState from "../globalState.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { dailyPlanning } from "./planning.mjs";

class Agent {
    constructor(id) {
        this.id = id;
        this.dailyPlans = "";
        this.nextFiveMinutesAction = "";
    }

    async init() {
        const agentInfo = await getAgentInfo(this.id);
        Object.assign(this, agentInfo);
        this.currentLocation = agentInfo.initialLocation;
    }

    async getDailyPlans() {
        const data = await dailyPlanning(this.id, globalState.getDate())
        const dailyPlans = extractContentBetweenFlags(data, "<##FLAG##>");
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
        } else {
            console.log("No daily plans found for today.");
        }
        return this.dailyPlans;
    }

    async getNextFiveMinutesAction() {
        this.nextFiveMinutesAction = await this.getNextFiveMinutesAction();
    }
}

export default Agent;