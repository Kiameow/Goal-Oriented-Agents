import { getAgentsPath } from "../filepath.mjs";
import { hasOverlap, readJsonFileAsync, writeJsonFileAsync } from "../helper.mjs";
import { globalAgents } from "./agents/Agent.mjs";
import { converse, summarizeConversation } from "./agents/converse.mjs";
import { globalTime } from "./globalTime.mjs";

let GlobalConversation = [];
async function globalConverse() {
    while (GlobalConversation.length > 0) {
        const conversationInfo = GlobalConversation.shift();
        const dialogToPush = { timestamp: globalTime.getCurrentTimestamp(), conversation: [] };
        const response = await converse(conversationInfo.participants, conversationInfo.topic);
        dialogToPush.conversation = response;

        await saveConversation(dialogToPush);
        const summary = await summarizeConversation(response);
        await saveConversationSummaryToMemory(conversationInfo.participants, summary);
        GlobalConversation = GlobalConversation.filter(c => !hasOverlap(c.participants, conversationInfo.participants))
    }
}

async function saveConversation(dialog) {
    const globalDialogsPath = getAgentsPath() + "/globalDialogs.json"
    let globalDialogs = await readJsonFileAsync(globalDialogsPath);
    if (!globalDialogs) {
        globalDialogs = [];
    }
    globalDialogs.push(dialog);
    await writeJsonFileAsync(globalDialogsPath, globalDialogs);
}

async function saveConversationSummaryToMemory(participants, conversationSummary) {
    const agents = participants.map(id => globalAgents.get(id));
    const saveSummaryToMemoryPromises = agents.map(async (agent) => {
        await agent.memory.createMemoryNode(conversationSummary);
    });
    await Promise.all(saveSummaryToMemoryPromises);
}

export { globalConverse, GlobalConversation, saveConversationSummaryToMemory };