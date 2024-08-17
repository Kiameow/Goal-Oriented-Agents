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
import globalState from "../globalTime.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { dailyPlanning, getCurrentPlan, getNextAction, hourlyPlanning } from "./planning.mjs";

class Agent {
    constructor(id) {
        this.id = id;
        this.dailyPlans = "";
        this.hourlyPlans = "";
        this.nextAction = "";
    }

    async init() {
        const agentInfo = await getAgentInfo(this.id);
        Object.assign(this, agentInfo);
        this.currentLocation = agentInfo.initialLocation;
    }

    async getDailyPlans() {
        const data = await dailyPlanning(this.id, globalState.getDate())
        const dailyPlans = extractContentBetweenFlags(data, "<##FLAG##>");
        console.log(dailyPlans);
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
        } else {
            console.log("No daily plans found for today.");
        }

        this.dailyPlans = dailyPlans;
        if (this.dailyPlans) {
            return true;
        } else {
            return false;
        }
    }

    async getHourlyPlans() {
        if (!this.dailyPlans) {
            console.log("Cannot get hourly plans without daily plans.");
            return false;
        }

        try {
            const data = await hourlyPlanning(this.id, this.dailyPlans, globalState.getDate())
            const hourlyPlans = extractContentBetweenFlags(data, "<##FLAG##>");
            console.log(hourlyPlans);
            if (hourlyPlans) {
                const timeTable = JSON.parse(hourlyPlans);
                this.hourlyPlans = timeTable;
            } else {
                console.log("No hourly plans found for today.");
            }

            if (this.hourlyPlans) {
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.warn("error | getHourlyPlans | Agent.mjs | ", error);
            return false;
        }
    }

    async getNextAction() {
        // compare the current time with the timetable and return the current running plan
        const planRightNow = getCurrentPlan(this.hourlyPlans, globalState.getTime())
        const surroundingRightNow = 
        this.nextAction = await getNextAction(this.id, planRightNow, surroundingRightNow, globalState.getDate(), globalState.getTime(), 10) 
    }
}

export default Agent;