import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { getPromptPath, getAgentsPath } from "../../filepath.mjs";
import { handlebarHydrate, readJsonFile } from "../../helper.mjs";
import { getAgentInfo, getCommonset } from "./agentHelper.mjs";
import { globalAgents } from "./Agent.mjs";
import { getEstatesInfo } from "./percive.mjs";

async function dailyPlanning(agentId, datetime) {
// {{commonset}}

// In general, {{lifestyle}}
// Today is {{datetime}}. Here is {{agentName}}'s plan today in broad-strokes (with the time of the day. e.g., have a lunch at 12:00 pm, watch TV from 7 to 8 pm): 1) wake up and complete the morning routine at {{wakeHour}}, 2)
    const agentInfo = globalAgents.get(agentId);
    const commonset = getCommonset(agentInfo);

    const templatePath = getPromptPath() + "/dailyPlanning.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        commonset: commonset,
        datetime: datetime,
        agentName: agentInfo.name,
        goal: agentInfo.goal,
        role: agentInfo.role,
        wakeHour: agentInfo.wakeHour,
    })

    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    return response.result;
}

// TODO getNextFiveMinutesAction
// TODO hourlyPlanning
async function hourlyPlanning(agentId, dailyPlans, datetime) {
    const agentInfo = globalAgents.get(agentId);
    const commonset = getCommonset(agentInfo);

    const templatePath = getPromptPath() + "/hourlyPlanning.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        commonset: commonset,
        datetime: datetime,
        dailyPlans: dailyPlans,
        agentName: agentInfo.name,
        goal: agentInfo.goal,
        role: agentInfo.role,
    })

    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    return response.result;
}

async function getNextAction(agentId, planRightNow, surrounding, time, duration) {
    const agentInfo = globalAgents.get(agentId);
    const commonset = getCommonset(agentInfo);
    const estates = await getEstatesInfo();
    
    const templatePath = getPromptPath() + "/getNextAction.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        commonset: commonset,
        surrounding: surrounding,
        clocktime: time,
        estates: estates,
        plan: planRightNow,
        agentName: agentInfo.name,
        goal: agentInfo.goal,
        role: agentInfo.role,
    })
    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    return response.result;
}



/**
 * return the current plan based on the timetable and the current clocktime
 * timetable: [{plan: "plan1", clockScale: 10}] clockScale is the ending hour of the plan
 * clocktime: {hour: 10, minute: 30}
 * @param {*} timetable 
 * @param {*} clocktime 
 */
async function getCurrentPlan(timetable, clocktime) {
    // better way may be to delete the passed plans, so the first plan will be the current plan
    let planRightNow = "";
    timetable.forEach(item => {
        if ( clocktime.hour < item.clockScale ) {
            planRightNow = item.plan;
        }
    });
    return planRightNow; // string 
}

export { dailyPlanning, hourlyPlanning, getNextAction, getCurrentPlan };