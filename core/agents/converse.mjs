import { containsChinese, extractContentBetweenFlags, getPrompt, isJSON } from "../../helper.mjs";
import { sysdebug, syserror, sysinfo, syswarn } from "../../logger.mjs";
import { globalTime } from "../globalTime.mjs";
import { sendQueryWithValidation } from "../llm/sendQuery.mjs";
import { globalAgentIds, globalAgents, turnNameToId } from "./Agent.mjs";
import { getCommonset } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";

// if there are other agents in the same room, decide whether to converse with them
async function willToConverse(agent) {
    try {
        const surroundingInfo = await getSurroundingInfo(agent);
        const agentInfo = agent.agentInfo;
        const commonset = getCommonset(agentInfo);
        const prompt = `
            ---
            ${commonset}

            ${agentInfo.name}'s goal is ${agentInfo.goal}, who assumes the role of ${agentInfo.role}, and currently ${agent.currentPlan}

            related memories:
            ${agent.relatedMemos}
            ---
            Right now is ${globalTime.toString()}. ${agentInfo.name} ${surroundingInfo}

            Based on the task at hand and the current situation, determine if ${agentInfo.name} will converse or not. Consider the following:
            1. Is the current task achievable without conversational interaction?
            2. Is there a compelling reason to initiate a conversation?
            3. Are there suitable conversation partners present?

            If ${agentInfo.name} is going to converse, output a JSON object in the following format:
            {
                "will_converse": true,
                "converse_with": ["agent_name1", "agent_name2"],
                "topic": "specific_topic_to_discuss"
            }
            

            If ${agentInfo.name} will not converse, output:
            {
                "will_converse": false
            }
            
            Note: Ensure your response is a valid JSON object and nothing else. All content should be in English.
        `;

        sysdebug("|", agent.id, "| converse prompt: ", prompt);

        let result = await sendQueryWithValidation(prompt, validateConverseWill);
        sysinfo("|", agent.id, "| converse will result: ", result);
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
        syswarn("|", "converse result contains Chinese")
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