import { getPrompt } from "../../helper.mjs";
import globalTime from "../globalTime.mjs";
import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { getCommonset } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";

// if there are other agents in the same room, decide whether to converse with them
async function willToConverse(agent) {
    // relationship, related memory
    try {
        const random = Math.random();
        if (random < 0.5) {
            return null;
        }

        const surroundingInfo = getSurroundingInfo(agent);
        const prompt = getPrompt("willToConverse", {
            commonset: getCommonset(agent),
            surrounding: surroundingInfo,
            agentName: agent.name,
            goal: agent.goal,
            role: agent.role,
            clocktime: globalTime.getCurrentClockTime()
        })

        const resultStr = await sendQuerySafely(prompt, null);
        let result = null;
        if (resultStr) {
            result = JSON.parse(resultStr);
        }
        return result;
    } catch (e) {
        console.error(e);
    }
}

async function converse(agentsList, topic) {
    try {
        const prompt = getPrompt("converse", {
            participants: agentsList,
            topic: topic,
            rounds: 10
        });
        const resultStr = await sendQuerySafely(prompt, null);
        let result = null;
        if (resultStr) {
            result = JSON.parse(resultStr);
        }
        return result;
    } catch (e) {
        console.error(e);
    }
}