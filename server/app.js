import express from 'express';
import cors from 'cors';
import taskRoutes from './routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', taskRoutes);

app.listen(5001, () => {
  console.log('Agent service is running on port 5001');
});
