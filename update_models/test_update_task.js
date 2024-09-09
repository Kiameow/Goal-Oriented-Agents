import taskHttp from "../frontend_api/api/taskHttp.js";
import fetchAll from "../frontend_api/fetchAll.js";

const advanceTaskProgression = async (authHeader, project_id, task_id) => {
    let tasks = [];
    await fetchAll.fetchAllTasks(authHeader, project_id, tasks);
    let editTaskForm = tasks.find(t => t.uid === task_id);
    // 这里插入大模型的推进任务函数，把需要更改的数据写入editTaskForm
    // 假设推进任务后，任务的状态变为已完成
    editTaskForm.is_finished = true;
    editTaskForm.date_finished = "2024-09-16T22:30:00Z";
    console.log("editTaskForm:", editTaskForm);
    try {
        await taskHttp.updateTaskForGPT(authHeader, project_id, task_id, editTaskForm);
    } catch (detail) {
        const errorMessage = Array.isArray(detail)
            ? detail.join(' ')
            : (detail.response?.data?.detail || '未知错误');
        console.log("推进任务出错：", errorMessage);
    }
}

export default{
    advanceTaskProgression
}
