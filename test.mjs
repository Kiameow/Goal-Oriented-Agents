import Agent from "./core/agents/Agent.mjs";

const mariaLopez = new Agent("Maria_Lopez");
await mariaLopez.init();
const resposne = await mariaLopez.getDailyPlans();
console.log(resposne);