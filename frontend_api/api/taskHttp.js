import http from "./http.js"

const getTask = (JWTtoken, project_id, params) => {
    const path = `/task/${project_id}/task/gpt`
    params = params?params:{}
    return http.get(JWTtoken, path, params)
}

const addTask = (JWTtoken, project_id, data) => {
    const path = `/task/${project_id}/task/gpt`
    return http.post(JWTtoken, path, data)
}

const updateTaskForGPT = (JWTtoken, project_id, pk, data) => {
    const path = `/task/${project_id}/task/gpt/` + pk
    return http.put(JWTtoken, path, data)
}

const deleteTask = (JWTtoken, project_id, pk) => {
    const path = `/task/${project_id}/task/gpt/` + pk
    return http.delete(JWTtoken, path)
}

export default {
    getTask,
    addTask,
    updateTaskForGPT,
    deleteTask
}