import { globalAgents } from "./core/agents/Agent.mjs";
import globalTime from "./core/globalTime.mjs";

globalTime.setTime(0, 10, 10);
await globalAgents.get('Maria_Lopez').getDailyPlans();
await globalAgents.get('Maria_Lopez').getHourlyPlans();
await globalAgents.get('Maria_Lopez').getNextAction();