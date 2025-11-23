import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/auth.js';
import { askAI } from '../utils/aihelper.js'

interface AskAIParams {
  question: string;
}

const schema = {
  params: {
    type: 'object',
    properties: {
      question: { type: 'string' }
    },
    required: ['question']
  },
};

export const aiRoute = async (fastify: FastifyInstance) => {
  fastify.get('/askai/:question', { schema }, async (
    request: FastifyRequest<{ Params: AskAIParams }>,
    reply: FastifyReply
  ) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Authorization token required' });
      }

      const token = authHeader.split(' ')[1];

      try {
        verifyToken(token);
      } catch (error) {
        return reply.status(401).send({ message: 'Invalid or expired token' });
      }

      const userid = JSON.parse(atob(token.split('.')[1])).userId;

      const { question } = request.params;

      console.log(question);
      const resp = await askAI(userid, question);
      console.log(resp);

      return reply.status(200).send({ response: resp });
    } catch (error) {
      console.log(error);
      return reply.status(500).send({ message: error });
    }
  });
};