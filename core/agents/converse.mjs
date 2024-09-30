import { containsChinese, extractContentBetweenFlags, getPrompt, isJSON } from "../../helper.mjs";
import { sysdebug, syserror, sysinfo, syswarn } from "../../logger.mjs";
import { globalTime } from "../globalTime.mjs";
import { sendQuerySafely, sendQueryWithValidation } from "../llm/sendQuery.mjs";
import { globalAgentIds, globalAgents, turnNameToId } from "./Agent.mjs";
import { getCommonset } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";

// if there are other agents in the same room, decide whether to converse with them
async function willToConverse(agent) {
    // relationship, related memory
    try {
        const surroundingInfo = await getSurroundingInfo(agent);
        const agentInfo = agent.agentInfo;
        const prompt = await getPrompt("willToConverse.hbs", {
            commonset: getCommonset(agentInfo),
            plan: agent.currentPlan,
            memos: agent.relatedMemos,
            surrounding: surroundingInfo,
            agentName: agentInfo.name,
            goal: agentInfo.goal,
            role: agentInfo.role,
            clocktime: globalTime.toString()
        })
        sysdebug("|", agent.id, "| converse prompt: ", prompt);

        let result = await sendQueryWithValidation(prompt, validateConverseWill);
        sysinfo("|", agent.id, "| converse result: ", result);
        return result;
    } catch (e) {
        syserror(e);
        return {
            will_converse: false
        }
    }
}

async function converse(agentIdList, topic) {
    try {
        const agentsList = agentIdList.map(id => globalAgents.get(id));
        const innerThoughtsPromises = agentsList.map(async (agent) => { await agent.getInnerThoughts(topic)} );
        await Promise.all(innerThoughtsPromises);
        const prompt = await getPrompt("converse.hbs", {
            participants: agentsList,
            topic: topic,
            rounds: 10
        });
        // sysinfo ("|", "converse prompt: ", prompt);
        let result = await sendQueryWithValidation(prompt, validateConverse);
        sysinfo ("|", "converse result: ", result);
        result = extractDialogues(result);
        return result;
    } catch (e) {
        syserror(e);
        return [];
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

        // turn the names into ids
        converseWill.converse_with = converseWill.converse_with.map(name => name.trim().split(" ").join("_"));

        const invalidAgentIds = converseWill.converse_with.filter(id => !globalAgentIds.includes(id));
        if (invalidAgentIds.length > 0) {
            return false;
        }
    }
    return true;
}

function validateConverse(converse) {
    if (containsChinese(JSON.stringify(converse))) {
        return false;
    }
    if (!Array.isArray(converse.conversation)) {
        syswarn("|", "converse result is not an array")
        return false;
    }

    if (converse.conversation.some(c => {
        if (typeof c.round !== "number" || typeof c.dialogue !== "object") {
            return true;
        }
        if (typeof c.dialogue.speaker !== 'string' && typeof c.dialogue.utterance !== 'string') {
            return true;
        }
        if (!globalAgentIds.includes(turnNameToId(c.dialogue.speaker))) {
            return true;
        }
        return false;
    })) {
        syswarn("|", "converse result is not valid")
        return false;
    }
    return true;
}

async function summarizeConversation(conversation) {
    try {
        const prompt = await getPrompt("summarizeConversation.hbs", {
            conversation: conversation
        });
        sysdebug ("|", "summary conversation prompt: ", prompt);

        const summary = await sendQueryWithValidation(prompt, validateSummarizeConversation, false)
        
        sysinfo ("|", "summary conversation result: ", summary);
        return summary;
    } catch (e) {
        syserror(e);
        return ""
    }
}

function extractDialogues(conversationObject) {
    // Check if the conversation object has the expected structure
    if (!conversationObject || !Array.isArray(conversationObject.conversation)) {
      throw new Error("Invalid conversation object format");
    }
  
    // Map through the conversation array to create the new simplified structure
    const simplifiedDialogues = conversationObject.conversation.map(item => {
      return {
        speaker: item.dialogue.speaker,
        utterance: item.dialogue.utterance
      };
    });
  
    return simplifiedDialogues;
}

function validateSummarizeConversation(summary) {
    if (summary.length < 10) {
        syswarn("|", "summary too short")
        return false;
    } else if (containsChinese(summary)) {
        syswarn("|", "summary contains Chinese")
        return false;
    }
    return true;
}

export { willToConverse, converse, extractDialogues, summarizeConversation };