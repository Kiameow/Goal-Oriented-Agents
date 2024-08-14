import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { getPromptPath, getAgentsPath } from "../../filepath.mjs";
import { handlebarHydrate, readJsonFile } from "../../helper.mjs";
import { getAgentInfo, getCommonset } from "./agentHelper.mjs";

async function dailyPlanning(agentName, datetime) {
// {{commonset}}

// In general, {{lifestyle}}
// Today is {{datetime}}. Here is {{agentName}}'s plan today in broad-strokes (with the time of the day. e.g., have a lunch at 12:00 pm, watch TV from 7 to 8 pm): 1) wake up and complete the morning routine at {{wakeHour}}, 2)
    const agentInfo = await getAgentInfo(agentName);
    const commonset = getCommonset(agentInfo);

    const templatePath = getPromptPath() + "/dailyPlanning.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        commonset: commonset,
        datetime: datetime,
        agentName: agentName,
        goal: agentInfo.goal,
        role: agentInfo.role,
        wakeHour: agentInfo.wakeHour,
    })

    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    return response.result;
}

// TODO getNextFiveMinutesAction
// TODO hourlyPlanning

export { dailyPlanning };