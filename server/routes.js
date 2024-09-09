import { Router } from 'express';
import test_update_task from '../update_models/test_update_task.js';

const router = Router();

router.post('/process-task', (req, res) => {
  const { project_id, task_id } = req.body;
  const authHeader = req.headers['authorization'];  // 获取JWT

  console.log(`Processing project: ${project_id}, task: ${task_id}`);
  test_update_task.advanceTaskProgression(authHeader, project_id, task_id);
  res.json({ status: 'Task processed' });
});

export default router;

