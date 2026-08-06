import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { ensureUploadDir, UPLOADS_ROOT } from './utils/local-upload';

const app: Application = express();

ensureUploadDir('products');

// Enterprise Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_ROOT));

// Register Primary API Router
app.use('/api/v1', apiRouter);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Global Enterprise Error Handler
app.use(errorHandler);

export default app;
