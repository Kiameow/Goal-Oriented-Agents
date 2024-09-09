import http from "./http.js"

const getPeojectDefaultImages = (JWTtoken) => {
    const path = "/staff/getProjectDefaultImages"
    return http.get(JWTtoken, path)
}

const getProjectList = (JWTtoken, page=1, size=10, params) => {
    const path = `/staff/project`
    params = params?params:{}
    params['page'] = page
    params['size'] = size
    return http.get(JWTtoken, path, params)
}

const getProjectDetail = (JWTtoken, pk) => {
    const path = "/staff/project/" + pk
    return http.get(JWTtoken, path, data)
}

const addProject = (JWTtoken, data) => {
    const path = "/staff/project"
    return http.postWithImage(JWTtoken, path, data)
}

const updateProject = (JWTtoken, pk, data) => {
    const path = "/staff/project/" + pk
    return http.putWithImage(JWTtoken, path, data)
}

const deleteProject = (JWTtoken, pk) => {
    const path = "/staff/project/" + pk
    return http.delete(JWTtoken, path)
}


export default {
    getPeojectDefaultImages,
    getProjectList,
    getProjectDetail,
    addProject,
    updateProject,
    deleteProject
}