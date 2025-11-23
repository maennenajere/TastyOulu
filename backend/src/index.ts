import Fastify from 'fastify';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
//import { connectRedis } from './utils/cache.js'; add later too lazy now
import { authRoutes } from './routes/auth.js';
import { aiRoute } from './routes/ai.js';
import { topicRoutes } from './routes/topics.js';
import { reviewRoutes } from './routes/review.js';
import { updateRoutes, userInfoRoutes } from './routes/user.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const startServer = async () => {
  try {
    await connectDB();

    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(updateRoutes, { prefix: '/api/update' });
    await fastify.register(userInfoRoutes, { prefix: '/api/user' });
    await fastify.register(aiRoute, { prefix: '/api' });
    await fastify.register(reviewRoutes, { prefix: '/api' });
    await fastify.register(topicRoutes, { prefix: '/api' });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

startServer();