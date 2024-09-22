import { containsChinese, extractContentBetweenFlags, getPrompt, isJSON, readJsonFileAsync, readJsonFileSync, writeJsonFileAsync } from "../../helper.mjs";
import { syserror, sysinfo, syswarn } from "../../logger.mjs";
import { globalTime, GlobalTime } from "../globalTime.mjs";
import { sendQuerySafely, sendQueryWithValidation } from "../llm/sendQuery.mjs";
import { getCommonset } from "./agentHelper.mjs";

class Memory {
  constructor(memoryFilePath) {
    this.memoryFilePath = memoryFilePath;
    this.memories = this.loadMemories();
  }

  // 加载 JSON 文件中的记忆
  loadMemories() {
    try {
      return readJsonFileSync(this.memoryFilePath) ?? [];
    } catch (error) {
      syserror("memory loading failed: ", error);
      return [];
    }
  }

  // 将记忆保存到 JSON 文件
  async saveMemories() {
    try {
      writeJsonFileAsync(this.memoryFilePath, this.memories);
    } catch (error) {
      syserror("memory saving failed: ", error);
    }
  }

  // 创建新记忆并分类
  async createMemoryNode(description) {
    const keywords = await getKeywords(description);
    const timestamp = globalTime.getCurrentTimestamp();
    const importance = await evaluateImportance(description);
    const memoryNode = {
      description, // 包含基本描述和动作的结果
      keywords, // 关键词列表
      // category, // 记忆分类
      timestamp, // 时间戳记录
      importance
    };
    this.memories.push(memoryNode);
    await this.saveMemories();
  }

  // provide a text, return X memory nodes which gets top X scores.
  // socres = 0.5 * relevance + 0.3 * importance + 0.2 * recentness
  async retrieveMemories(text) {
    const keywords = await getKeywords(text);
    const { day: currentDay, hour: currentHour, minute: currentMinute } = globalTime.value;
    const currentTotalMinutes = currentDay * 1440 + currentHour * 60 + currentMinute;
  
    // Total number of keywords in query for relevance calculation
    const totalKeywordsInQuery = keywords.length;
  
    // Filter memories to calculate scores based on relevance, importance, and recency
    const scoredMemories = this.memories.map(memory => {
      // Calculate relevance by counting the number of matched keywords
      const matchedKeywords = memory.keywords.filter(keyword => keywords.includes(keyword));
      const relevanceScore = Math.floor(matchedKeywords.length / totalKeywordsInQuery * 100); // Normalize relevance
  
      const importanceScore = memory.importance;
  
      const { day: memoryDay, hour: memoryHour, minute: memoryMinute } = GlobalTime.parseTimestamp(memory.timestamp);
      const memoryTotalMinutes = memoryDay * 1440 + memoryHour * 60 + memoryMinute;
      const recentnessScore = Math.floor(memoryTotalMinutes / currentTotalMinutes * 100);
  
      // Combine scores keeping in mind their weights
      const combinedScore = Math.floor((0.5 * relevanceScore) + (0.3 * importanceScore) + (0.2 * recentnessScore));
  
      return { ...memory, score: combinedScore };
    });
  
    // Sort memories based on score in descending order and take the top X
    const X = 5; // Define how many top memories you want to retrieve
    const topMemories = scoredMemories
      .sort((a, b) => b.score - a.score) // Sort by score
      .slice(0, X); // Get the top X memories
  
    return topMemories; // Return the top memories
  }
}

async function getKeywords(text) {
    const prompt = await getPrompt("extractKeywords.hbs", {text: text});
    const keywords = await sendQueryWithValidation(prompt, validateKeywords);
    return keywords;
}

function validateKeywords(keywords) {
    if (!Array.isArray(keywords)) {
        syswarn("|", "Keywords result is not an array");
        return false;
    }

    // 检查数组中的每个元素是否都是字符串
    if (keywords.some(keyword => typeof keyword !== "string")) {
        syswarn("|", "Keywords result contains non-string elements");
        return false;
    }

    if (containsChinese(JSON.stringify(keywords))) {
        syswarn("|", "Keywords result contains Chinese characters");
        return false;
    }

    // 通过验证，返回true
    return true;
}

async function evaluateImportance(text) {
  const prompt = await getPrompt("evaluateImportance.hbs", {text: text});
  const importance = await sendQueryWithValidation(prompt, validateImportance);
  return importance;
}

function validateImportance(importance) {
  if (typeof importance !== "number" || importance < 0 || importance > 100) {
      syswarn("|", "Importance result is not a number");
      return false;
  }
  return true;
}

function getMemosDescription(memos) {
    return memos.map(memo => `${GlobalTime.getExpressiveTime(GlobalTime.parseTimestamp(memo.timestamp))}  ${memo.description}`).join("\n");
}

async function getInnerThoughts(agent, topic) {
  try {
    const agentInfo = agent.agentInfo;
    if (agent.relatedMemos.length === 0) {
      return "";
    }
    const prompt = await getPrompt("getInnerThoughts.hbs", {
      topic: topic,
      agentName: agentInfo.name,
      commonset: getCommonset(agentInfo),
      role: agentInfo.role,
      goal: agentInfo.goal,
      memos: agent.relatedMemos
    });
    const thoughts = await sendQueryWithValidation(prompt, validateInnerThoughts, false);
    return thoughts;
  } catch (error) {
    syserror("inner thoughts retrieval failed: ", error);
    return "";
  }
}

function validateInnerThoughts(thoughts) {
  if (typeof thoughts !== "string" || thoughts.length === 0) {
      syswarn("|", "Inner thoughts result is not string or empty");
      return false;
  }

  if (containsChinese(thoughts)) {
      syswarn("|", "Inner thoughts result contains Chinese characters");
      return false;
  }
  return true;
}

export { Memory, getKeywords, getMemosDescription, getInnerThoughts };
