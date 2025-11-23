import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Review } from '../models/review.js';
import { verifyToken } from '../utils/auth.js';

export const reviewRoutes = async (fastify: FastifyInstance) => {
    fastify.post('/review', async (request: FastifyRequest, reply: FastifyReply) => {
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
            const { reviewId, review, restaurantId, grade }: { reviewId?: string; review: string; restaurantId?: string; grade: string } = request.body as any;
            console.log(request.body)
    
            if (!review) {
                return reply.status(400).send({ error: 'review content is required' });
            }
    
            if (reviewId) {
                const existingReview = await Review.findOne({ reviewId });
                if (!existingReview) {
                    return reply.status(404).send({ error: 'Review not found' });
                }
    
                if (existingReview.userId !== userid) {
                    return reply.status(403).send({ error: 'Not authorized to edit this review' });
                }
    
                const success = await existingReview.editReview(parseInt(reviewId), review);
                
                if (!success) {
                    return reply.status(400).send({ error: 'Failed to update review' });
                }
    
                return reply.status(200).send({ message: 'Review updated successfully' });
            } else {
                if (!restaurantId) {
                    return reply.status(400).send({ error: 'restaurantId is required for new reviews' });
                }

                if (!grade) {
                    return reply.status(400).send({ error: 'grade is required for new reviews' });
                }
    
                const lastReview = await Review.findOne().sort({ reviewId: -1 });
                const newReviewId = lastReview ? lastReview.reviewId + 1 : 1;
    
                const newReview = new Review({
                    userId: userid,
                    reviewId: newReviewId,
                    restaurantId: restaurantId,
                    review: review,
                    grade: parseInt(grade),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
    
                await newReview.save();
    
                return reply.status(201).send({ 
                    message: 'Review created successfully',
                    reviewId: newReviewId 
                });
            }
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: 'Failed to process review request' });
        }
    });;

    fastify.get('/reviews', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { restaurantId } = request.query as { restaurantId?: string };
            
            let reviews;
            if (restaurantId) {
                const numericRestaurantId = parseInt(restaurantId);
                if (isNaN(numericRestaurantId)) {
                    return reply.status(400).send({ error: 'Invalid restaurantId' });
                }
                reviews = await Review.find({ restaurantId: numericRestaurantId });
            } else {
                reviews = await Review.find();
            }

            if (!reviews || reviews.length === 0) {
                return reply.status(404).send({ message: 'No reviews found' });
            }

            return reply.status(200).send(reviews);
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: 'Failed to fetch reviews' });
        }
    });
};