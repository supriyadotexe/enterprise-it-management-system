import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import departmentRoutes from './routes/department.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import userRoutes from './routes/user.routes.js';
import assetCategoryRoutes from './routes/assetCategory.routes.js';
import serviceCategoryRoutes from './routes/serviceCategory.routes.js';
import assetRoutes from './routes/asset.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import requestRoutes from './routes/request.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';
import lookupRoutes from './routes/lookup.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use('/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/departments', departmentRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/asset-categories', assetCategoryRoutes);
  app.use('/api/v1/service-categories', serviceCategoryRoutes);
  app.use('/api/v1/assets', assetRoutes);
  app.use('/api/v1/assignments', assignmentRoutes);
  app.use('/api/v1/requests', requestRoutes);
  app.use('/api/v1/maintenance', maintenanceRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/lookups', lookupRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
