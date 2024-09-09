import { getAgentsPath } from "../filepath.mjs";
import { hasOverlap, readJsonFileAsync, writeJsonFileAsync } from "../helper.mjs";
import { converse } from "./agents/converse.mjs";
import globalTime from "./globalTime.mjs";

let GlobalConversation = [];
async function globalConverse() {
    while (GlobalConversation.length > 0) {
        const conversationInfo = GlobalConversation.shift();
        const dialogToPush = { timestamp: globalTime.getCurrentTimestamp(), conversation: [] };
        const response = await converse(conversationInfo.participants, conversationInfo.topic);
        dialogToPush.conversation = response.conversation;

        await saveConversation(dialogToPush);
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


export { globalConverse, GlobalConversation };