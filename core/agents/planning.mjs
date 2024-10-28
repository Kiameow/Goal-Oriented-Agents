import { sendQuerySafely, sendQueryWithValidation } from "../llm/sendQuery.mjs";
import { getPromptPath, getAgentsPath } from "../../filepath.mjs";
import {
  containsChinese,
  extractContentBetweenFlags,
  handlebarHydrate,
  readJsonFileAsync,
} from "../../helper.mjs";
import { getAgentInfo, getCommonset } from "./agentHelper.mjs";
import { globalAgents } from "./Agent.mjs";
import { getEstatesInfo } from "./percive.mjs";
import { globalScen } from "../scen/Scen.mjs";
import chalk from "chalk";
import { syserror, syswarn, sysinfo, sysdebug } from "../../logger.mjs";
import { globalTime } from "../globalTime.mjs";

async function dailyPlanning(agentInfo, taskDescription, datetime) {
  try {
    const commonset = getCommonset(agentInfo);

    const prompt = `
        ---
        ${commonset}

        ${agentInfo.name}'s long-term goal is ${agentInfo.goal}, who assumes the role of ${agentInfo.role}.
        ---
        Today is day ${datetime}. ${agentInfo.name} wakes at ${agentInfo.wakeHour}am. ${taskDescription ? `${agentInfo.name}'s today's mission is ${taskDescription}.` : ''} 

        Please provide a detailed plan for ${agentInfo.name}'s day, from wake-up time until bedtime. The plan should:
        1. Be in a numbered list format.
        2. Include specific time ranges for each activity (e.g., "7:00 AM to 8:00 AM").
        3. Cover all major activities of the day, including meals, work/study, personal time, and sleep.
        4. Align with ${agentInfo.name}'s role, goals, and any specific tasks mentioned.
        5. Be realistic and allow for breaks or unexpected events.

        Format each item as: "<Number>. <StartTime> to <EndTime>: <Activity description>"

        Enclose your response within <##FLAG##> tags.

        Example:
        <##FLAG##>
        1. 7:00 AM to 8:00 AM: Wake up, morning routine (hygiene, get dressed)
        2. 8:00 AM to 8:30 AM: Breakfast and check emails
        3. 8:30 AM to 12:00 PM: Focus on primary work tasks
        ...
        10. 10:30 PM to 7:00 AM: Sleep and rest for the next day
        <##FLAG##>
    `;

    const dailyPlans = await sendQueryWithValidation(prompt, validateDailyPlans, false);
    return dailyPlans;
  } catch (error) {
    syserror(error);
    return `${agentInfo.name} decides to continue the tasks assigned in the morning and afternoon, take rest or eat food during the noon and night.`;
  }
}

function validateDailyPlans(dailyPlan) {
  if (containsChinese(dailyPlan)) {
    syswarn("Daily plan contains Chinese characters");
    return false;
  } 
  if (dailyPlan.length < 10) {
    syswarn("Daily plan is too short");
    return false;
  }
  return true;
}

async function getHourlyPlanPrompt(agentInfo, dailyPlans, startHour) {
  try {
    const commonset = getCommonset(agentInfo);

    const templatePath = getPromptPath() + "/hourlyPlanning.hbs";
    const prompt = await handlebarHydrate(templatePath, {
      commonset: commonset,
      dailyPlans: dailyPlans,
      agentName: agentInfo.name,
      goal: agentInfo.goal,
      role: agentInfo.role,
      startHour: startHour,
      endHour: startHour + 1,
    });
    return prompt;
  } catch (error) {
    syserror(error);
  }
}

async function hourlyPlanning(agentInfo, dailyPlans) {
  try {
    let wakeHour = null;
    if (typeof agentInfo.wakeHour === "string") {
      wakeHour = parseInt(agentInfo.wakeHour);
    } else {
      wakeHour = agentInfo.wakeHour;
    }

    let timetable = [];

    for (let i = 0; i < wakeHour; i++) {
      timetable.push({
        plan: "sleep",
        clockScale: i + 1,
        isDone: false,
      });
    }

    for (let i = wakeHour; i < 24; i++) {
      let planInOneHour = await getOneHourPlan(agentInfo, dailyPlans, i);
      timetable.push({
        plan: planInOneHour,
        clockScale: i + 1,
        isDone: false,
      });
    }
    return timetable;
  } catch (error) {
    syserror(error);
    return hourlyPlanning(agentInfo, dailyPlans, datetime);
  }
}

async function getOneHourPlan(agentInfo, dailyPlans, startHour) {
  try {
    const prompt = await getHourlyPlanPrompt(agentInfo, dailyPlans, startHour);
    let plan = sendQueryWithValidation(prompt, validateOneHourPlan, false);
    return plan;
  } catch (error) {
    syserror(error);
    return "continue with the previous plan";
  }
}

function validateOneHourPlan(oneHourPlan) {
  if (containsChinese(oneHourPlan)) {
    syswarn("One hour plan contains Chinese characters");
    return false;
  }
  if (oneHourPlan.length === 0) {
    syswarn("One hour plan is too short");
    return false;
  }
  return true;
}

async function getNextAction(
  agentInfo,
  planRightNow,
  surrounding,
  relatedMemos
) {
  try {
    const timestamp = globalTime.getCurrentTimestamp();
    const clocktime = globalTime.toString();

    const commonset = getCommonset(agentInfo);
    const estates = await getEstatesInfo();

    const templatePath = getPromptPath() + "/getNextAction.hbs";
    const prompt = await handlebarHydrate(templatePath, {
      commonset: commonset,
      surrounding: surrounding,
      clocktime: clocktime,
      estates: estates,
      plan: planRightNow,
      memos: relatedMemos,
      agentName: agentInfo.name,
      goal: agentInfo.goal,
      role: agentInfo.role
    });

    let nextAction = await sendQueryWithValidation(prompt, validateNextAction);
    nextAction = [timestamp, ...nextAction];
    return nextAction;
  } catch (error) {
    syserror(error);
    return null;
  }
}

function validateNextAction(nextAction) {
  if (containsChinese(JSON.stringify(nextAction))) {
    syswarn("Next action contains Chinese characters");
    return false;
  }
  if (!Array.isArray(nextAction) || nextAction.length !== 2) {
    syswarn("Next action is not an array of length 2");
    return false;
  }
  const estateIDs = globalScen.locations.map((s) => s.id);
  if (
    !estateIDs.includes(nextAction[0]) &&
    nextAction[0] !== "stay" &&
    nextAction[0] !== "STAY"
  ) {
    syswarn("Next action's destination is not valid");
    return false;
  }
  return true;
}

/**
 * return the current plan based on the timetable and the current clocktime
 * timetable: [{plan: "plan1", clockScale: 10}] clockScale is the ending hour of the plan
 * clocktime: {hour: 10, minute: 30}
 * @param {Array} timetable
 * @param {object} clocktime
 */
function getCurrentPlan(timetable, clocktimeObj) {
  // better way may be to delete the passed plans, so the first plan will be the current plan
  let planRightNow = "take the responsibility";
  for (let item of timetable) {
    if (item.clockScale > clocktimeObj.hour) {
        planRightNow = item.plan;
        return planRightNow;
      } else {
        item.isDone = true;
      }
  }
  return planRightNow; // string
}

export { dailyPlanning, hourlyPlanning, getNextAction, getCurrentPlan };
