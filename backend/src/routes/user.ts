import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/user.js';
import { verifyToken } from '../utils/auth.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import multipart from '@fastify/multipart';

export const updateRoutes = async (fastify: FastifyInstance) => {
	await fastify.register(multipart, {
		limits: {
			fileSize: 5000000,
		}
	});

	fastify.post('/avatar', async (request: any, reply: FastifyReply) => {
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

		try {
			const data = await request.file();

			if (!data) {
				return reply.status(400).send({ error: 'No file uploaded' });
			}

			const buffer = await data.toBuffer();
			const userid = JSON.parse(atob(token.split('.')[1])).userId;
			console.log(userid);
			writeFileSync(`${process.env.AVATAR_FOLDER}${userid}.jpg`, buffer);

			console.log(await User.updateOne(
				{ userId: userid },
				{ avatar: 'ok' }
			));

			return reply.status(200).send({ message: 'Avatar uploaded successfully' });
		} catch (error) {
			console.error(error);
			return reply.status(500).send({ error: 'Failed to process avatar upload' });
		}
	});

	fastify.post('/username', async (request: any, reply: FastifyReply) => {
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
	
		try {
			const { username } = request.body
	
			if (!username) {
				return reply.status(400).send({ error: 'No name given' });
			}
	
			const userid = JSON.parse(atob(token.split('.')[1])).userId;
			console.log(userid);
	
			console.log(await User.updateOne(
				{ userId: userid },
				{ username: username }
			));
	
			return reply.status(200).send({ message: 'Username updated successfully' });
		} catch (error) {
			console.error(error);
			return reply.status(500).send({ error: 'Failed to update username' });
		}
	});
};


export const userInfoRoutes = async (fastify: FastifyInstance) => {
	fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
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

		try {
			const userid = JSON.parse(atob(token.split('.')[1])).userId;
			console.log(userid);
			const data = await User.findOne({ userId: userid })

			return reply.status(200).send(data);
		} catch (error) {
			console.error(error);
			return reply.status(500).send({ error: 'Failed to process info request' });
		}
	});

	fastify.get('/user/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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

		try {
			const { id } = request.params;

			const data = await User.findOne({ userId: id }, { username: 1, score:1, avatar: 1, _id: 0 });

			if (!data) {
				return reply.status(404).send({ message: 'User not found' });
			}

			return reply.status(200).send(data);
		} catch (error) {
			console.error(error);
			return reply.status(500).send({ error: 'Failed to fetch user data' });
		}
	});

	fastify.get('/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
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

		if (existsSync(`${process.env.AVATAR_FOLDER}${userid}.jpg`)) {
			return reply.status(200).send(readFileSync(`${process.env.AVATAR_FOLDER}${userid}.jpg`))
		}

		return reply.status(200).send((await User.findOne({userId: userid}))?.avatar || {error: 'No avatar found'});
	});
}
