import { Schema, model, Document } from 'mongoose';

interface IReview {
  userId: number;
  reviewId: number;
  restaurantId: string;
  review: string;
  grade: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IReviewMethods {
  editReview(reviewId: number, review: string): Promise<boolean>;
}

type ReviewDocument = Document & IReview & IReviewMethods;

const reviewSchema = new Schema<ReviewDocument>({
  userId: { type: Number, required: true },
  reviewId: { type: Number, required: true, unique: true },
  grade: { type: Number, default: 0, required: true },
  review: { type: String, required: true },
  restaurantId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 }
});

reviewSchema.methods.editReview = async function(reviewId: number, review: string): Promise<boolean> {
  try {
    if (this.reviewId != reviewId) {
      console.log('Invalid reviewId provided');
      return false;
    }
    
    this.review = review;
    this.updatedAt = new Date();
    
    await this.save();
    return true;
  } catch (error) {
    console.error('Error in editReview:', error);
    return false;
  }
};

export const Review = model<ReviewDocument>('Review', reviewSchema);