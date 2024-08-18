import { globalAgents } from "./core/agents/Agent.mjs";
// const mariaLopez = new Agent("Maria_Lopez");
// await mariaLopez.init();
// await mariaLopez.getDailyPlans();
// await mariaLopez.getHourlyPlans();
// console.dir(globalAgents['Maria_Lopez']);
await globalAgents.get('Maria_Lopez').getDailyPlans();
await globalAgents.get('Maria_Lopez').getHourlyPlans();
await globalAgents.get('Maria_Lopez').getNextAction();