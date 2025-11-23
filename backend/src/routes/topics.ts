import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Topic, Comment } from '../models/topics.js';
import { User } from '../models/user.js';
import { verifyToken } from '../utils/auth.js';

const authCheck = (request: FastifyRequest, reply: FastifyReply): number | null => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({ message: 'Authorization token required' });
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        verifyToken(token);
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || null;
    } catch (error) {
        reply.status(401).send({ message: 'Invalid or expired token' });
        return null;
    }
};

export const topicRoutes = async (fastify: FastifyInstance) => {
    // Create topic
    fastify.post('/topic', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { title }: { title?: string } = request.body as any;
        if (!title) return reply.status(400).send({ error: 'Title is required' });

        try {
            const topic = new Topic({ title, creatorUserId: userId, timestamp: new Date(), likes: [] });
            await topic.save();
            reply.status(201).send({ message: 'Topic created', topicId: topic._id?.toString() });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to create topic' });
        }
    });

    // Edit topic
    fastify.put('/topic/:topicId', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { topicId } = request.params as { topicId: string };
        const { title }: { title?: string } = request.body as any;
        if (!title) return reply.status(400).send({ error: 'Title is required' });

        try {
            const topic = await Topic.findById(topicId);
            if (!topic) return reply.status(404).send({ error: 'Topic not found' });
            if (topic.creatorUserId !== userId) return reply.status(403).send({ error: 'Not authorized' });

            const success = await topic.editTopic(title);
            reply.status(success ? 200 : 400).send({ message: success ? 'Topic updated' : 'Failed to update topic' });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to update topic' });
        }
    });

    // Delete topic
    fastify.delete('/topic/:topicId', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { topicId } = request.params as { topicId: string };

        try {
            const topic = await Topic.findById(topicId);
            if (!topic) return reply.status(404).send({ error: 'Topic not found' });
            if (topic.creatorUserId !== userId) return reply.status(403).send({ error: 'Not authorized' });

            await Topic.deleteOne({ _id: topicId });
            await Comment.deleteMany({ topicId });
            reply.status(200).send({ message: 'Topic deleted' });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to delete topic' });
        }
    });

    // Like topic
    fastify.post('/topic/:topicId/like', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { topicId } = request.params as { topicId: string };
 
        try {
            const topic = await Topic.findById(topicId);
            if (!topic) return reply.status(404).send({ error: 'Topic not found' });
            if (topic.likes.includes(userId)) return reply.status(400).send({ error: 'Already liked' });

            topic.likes.push(userId);
            await topic.save();
            const creator = topic.creatorUserId
            console.log(creator)
            const updateResult = await User.updateOne(
                { userId: creator }, 
                { $inc: { score: 1 } } 
              );
              
              console.log(updateResult);
              reply.status(200).send({ message: 'Topic liked', likes: topic.likes.length });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to like topic' });
        }
    });

    // Create comment
    fastify.post('/topic/:topicId/comment', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { topicId } = request.params as { topicId: string };
        const { text }: { text?: string } = request.body as any;
        if (!text) return reply.status(400).send({ error: 'Text is required' });

        try {
            const topic = await Topic.findById(topicId);
            if (!topic) return reply.status(404).send({ error: 'Topic not found' });

            const comment = new Comment({ topicId, text, commenterUserId: userId, timestamp: new Date(), likes: [] });
            console.log(await Topic.updateOne({_id: topicId}, { $inc: { commentCount: 1 }}))
            await comment.save();
            reply.status(201).send({ message: 'Comment created', commentId: comment._id?.toString() });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to create comment' });
        }
    });


    fastify.get('/topic/:topicId/comments', async (request, reply) => {
        try {
            const { topicId } = request.params as { topicId: string };
            const topic = await Topic.findById(topicId);
            if (!topic) return reply.status(404).send({ error: 'Topic not found' });

            const comments = await Comment.find({ topicId });
            if (!comments.length) return reply.status(404).send({ message: 'No comments found' });

            reply.status(200).send(comments);
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to fetch comments' });
        }
    });

    // Edit comment
    fastify.put('/comment/:commentId', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { commentId } = request.params as { commentId: string };
        const { text }: { text?: string } = request.body as any;
        if (!text) return reply.status(400).send({ error: 'Text is required' });

        try {
            const comment = await Comment.findById(commentId);
            if (!comment) return reply.status(404).send({ error: 'Comment not found' });
            if (comment.commenterUserId !== userId) return reply.status(403).send({ error: 'Not authorized' });

            const success = await comment.editComment(text);
            reply.status(success ? 200 : 400).send({ message: success ? 'Comment updated' : 'Failed to update comment' });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to update comment' });
        }
    });

    // Delete comment
    fastify.delete('/comment/:commentId', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { commentId } = request.params as { commentId: string };

        try {
            const comment = await Comment.findById(commentId);
            if (!comment) return reply.status(404).send({ error: 'Comment not found' });
            if (comment.commenterUserId !== userId) return reply.status(403).send({ error: 'Not authorized' });

            await Comment.deleteOne({ _id: commentId });
            const topic = await Topic.findById(comment.topicId);
            if (topic) {
                topic.commentCount = await Comment.countDocuments({ topicId: comment.topicId });
                await topic.save();
            }
            reply.status(200).send({ message: 'Comment deleted' });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to delete comment' });
        }
    });

    // Like comment
    fastify.post('/comment/:commentId/like', async (request, reply) => {
        const userId = authCheck(request, reply);
        if (!userId) return;

        const { commentId } = request.params as { commentId: string };

        try {
            const comment = await Comment.findById(commentId);
            if (!comment) return reply.status(404).send({ error: 'Comment not found' });
            if (comment.likes.includes(userId)) return reply.status(400).send({ error: 'Already liked' });

            comment.likes.push(userId);
            await comment.save();
            const creator = comment.commenterUserId
            console.log(creator)
            const updateResult = await User.updateOne(
                { userId: creator }, 
                { $inc: { score: 1 } } 
              );
              
              console.log(updateResult);
            reply.status(200).send({ message: 'Comment liked', likes: comment.likes.length });
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to like comment' });
        }
    });

    // Get topics
    fastify.get('/topics', async (request, reply) => {
        try {
            const { creatorUserId } = request.query as { creatorUserId?: string };
            const filter = creatorUserId && !isNaN(parseInt(creatorUserId)) ? { creatorUserId: parseInt(creatorUserId) } : {};
            const topics = await Topic.find(filter);

            if (!topics.length) return reply.status(404).send({ message: 'No topics found' });
            reply.status(200).send(topics);
        } catch (error) {
            console.error(error);
            reply.status(500).send({ error: 'Failed to fetch topics' });
        }
    });
};