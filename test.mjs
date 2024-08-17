import Agent from "./core/agents/Agent.mjs";

const mariaLopez = new Agent("Maria_Lopez");
await mariaLopez.init();
await mariaLopez.getDailyPlans();
await mariaLopez.getHourlyPlans();