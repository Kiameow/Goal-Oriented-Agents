import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { getPromptPath, getAgentsPath } from "../../filepath.mjs";
import {
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
import globalTime from "../globalTime.mjs";

async function dailyPlanning(agentInfo, datetime) {
  // {{commonset}}

  // In general, {{lifestyle}}
  // Today is {{datetime}}. Here is {{agentName}}'s plan today in broad-strokes (with the time of the day. e.g., have a lunch at 12:00 pm, watch TV from 7 to 8 pm): 1) wake up and complete the morning routine at {{wakeHour}}, 2)
  try {
    const commonset = getCommonset(agentInfo);

    const templatePath = getPromptPath() + "/dailyPlanning.hbs";
    const prompt = await handlebarHydrate(templatePath, {
      commonset: commonset,
      datetime: datetime,
      agentName: agentInfo.name,
      goal: agentInfo.goal,
      role: agentInfo.role,
      wakeHour: agentInfo.wakeHour,
    });

    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    let dailyPlan = response.result;
    dailyPlan = extractContentBetweenFlags(dailyPlan, "<##FLAG##>");
    return dailyPlan;
  } catch (error) {
    syserror(error);
    return dailyPlanning(agentInfo, datetime);
  }
}

// TODO getNextFiveMinutesAction
// TODO hourlyPlanning

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
    let plan = "continue with the previous plan";
    const response = await sendQuerySafely(prompt, "...(No response)", 5, true);
    let planStr = response.result;
    planStr = extractContentBetweenFlags(planStr, "<##FLAG##>");
    if (planStr) {
      plan = planStr;
    }
    return plan;
  } catch (error) {
    syserror(error);
  }
}

async function getNextAction(
  agentInfo,
  planRightNow,
  surrounding,
  duration
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
      agentName: agentInfo.name,
      goal: agentInfo.goal,
      role: agentInfo.role,
    });

    let nextAction = [];
    do {
      const response = await sendQuerySafely(
        prompt,
        "...(No response)",
        5,
        true
      );
      let nextActionStr = response.result;
      nextActionStr = extractContentBetweenFlags(nextActionStr, "<##FLAG##>");
      nextActionStr = extractContentBetweenFlags(nextActionStr, "```json", "```");
      sysdebug(nextActionStr);
      if (nextActionStr) {
        nextAction = JSON.parse(nextActionStr);
      }
    } while (!validateNextAction(nextAction));
    nextAction = [timestamp, ...nextAction];
    return nextAction;
  } catch (error) {
    syserror(error);
    return getNextAction(agentInfo, planRightNow, surrounding, duration);
  }
}


function validateNextAction(nextAction) {
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
async function getCurrentPlan(timetable, clocktimeObj) {
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
