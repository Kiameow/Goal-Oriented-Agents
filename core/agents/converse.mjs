import { extractContentBetweenFlags, getPrompt, isJSON } from "../../helper.mjs";
import { syserror } from "../../logger.mjs";
import globalTime from "../globalTime.mjs";
import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { globalAgentIds } from "./Agent.mjs";
import { getCommonset } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";

// if there are other agents in the same room, decide whether to converse with them
async function willToConverse(agent) {
    // relationship, related memory
    try {
        // const random = Math.random();
        // if (random < 0.5) {
        //     return {
        //         will_converse: false
        //     }
        // }

        const surroundingInfo = getSurroundingInfo(agent);
        const prompt = await getPrompt("willToConverse.hbs", {
            commonset: getCommonset(agent),
            plan: agent.currentPlan,
            surrounding: surroundingInfo,
            agentName: agent.name,
            goal: agent.goal,
            role: agent.role,
            clocktime: globalTime.toString()
        })

        let result = null;
        do {
            const response = await sendQuerySafely(prompt, null);
            let resultStr = response.result;
            resultStr = extractContentBetweenFlags(resultStr, "<##FLAG##>")
            if (resultStr && isJSON(resultStr)) {
                result = JSON.parse(resultStr);
            }
        } while (!result || !validateConverseWill(result))
        return result;
    } catch (e) {
        syserror(e);
        return {
            will_converse: false
        }
    }
}

async function converse(agentsList, topic) {
    try {
        const prompt = getPrompt("converse.hbs", {
            participants: agentsList,
            topic: topic,
            rounds: 10
        });
        let result = null;
        do {
            const response = await sendQuerySafely(prompt, null);
            const resultStr = response.result;
            if (resultStr && isJSON(resultStr)) {
                result = JSON.parse(resultStr);
            }
        } while (!result || !validateConverse(result))
        return result;
    } catch (e) {
        syserror(e);
        return { conversation: [] };
    }
}

function validateConverseWill(converseWill) {
    if (typeof converseWill.will_converse !== 'boolean') {
        return false;
    }

    if (converseWill.will_converse) {
        if (!Array.isArray(converseWill.converse_with) || converseWill.converse_with.some(name => typeof name !== 'string')) {
            return false;
        }
        if (typeof converseWill.topic !== 'string') {
            return false;
        }

        const invalidAgentIds = converseWill.converse_with.filter(id => !globalAgentIds.includes(id));
        if (invalidAgentIds.length > 0) {
            return false;
        }
    }
    return true;
}

function validateConverse(converse) {
    if (!Array.isArray(converse.conversation)) {
        return false;
    }

    if (converse.conversation.some(c => {
        if (typeof c.round !== "number" || typeof c.dialogue !== "object") {
            return true;
        }
        if (typeof c.dialogue.speaker !== 'string' && typeof c.dialogue.utterance !== 'string') {
            return true;
        }
        if (!globalAgentIds.includes(c.dialogue.speaker)) {
            return true;
        }
        return false;
    })) {
        return false;
    }
    return true;
}

export { willToConverse, converse };