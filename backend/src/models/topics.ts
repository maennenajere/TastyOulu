import { Schema, model, Document } from 'mongoose';

interface ITopic {
  title: string;
  creatorUserId: number;
  timestamp: Date;
  commentCount: number;
  likes: number[];
}

interface ITopicMethods {
  editTopic: (title: string) => Promise<boolean>;
}

type TopicDocument = Document & ITopic & ITopicMethods;

const topicSchema = new Schema<TopicDocument>({
  title: { type: String, required: true, index: true },
  creatorUserId: { type: Number, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  commentCount: { type: Number, default: 0 },
  likes: { type: [Number], default: [] }
}, { timestamps: false });

topicSchema.methods.editTopic = async function(this: TopicDocument, title: string): Promise<boolean> {
  try {
    this.title = title;
    this.timestamp = new Date();
    await this.save();
    return true;
  } catch (error) {
    console.error('Error in editTopic:', error);
    return false;
  }
};

interface IComment {
  topicId: Schema.Types.ObjectId;
  text: string;
  commenterUserId: number;
  timestamp: Date;
  likes: number[];
}

interface ICommentMethods {
  editComment: (text: string) => Promise<boolean>;
}

type CommentDocument = Document & IComment & ICommentMethods;

const commentSchema = new Schema<CommentDocument>({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  text: { type: String, required: true },
  commenterUserId: { type: Number, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  likes: { type: [Number], default: [] }
}, { timestamps: false, autoIndex: true });

// Update commentCount on comment creation
commentSchema.pre('save', async function(this: CommentDocument, next) {
  try {
    const topic = await Topic.findById(this.topicId);
    if (topic) {
      topic.commentCount = await Comment.countDocuments({ topicId: this.topicId });
      await topic.save();
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error as Error);
  }
});

// Update commentCount on comment deletion
commentSchema.post('deleteOne', { document: true, query: false }, async function(this: CommentDocument) {
  try {
    const topic = await Topic.findById(this.topicId);
    if (topic) {
      topic.commentCount = await Comment.countDocuments({ topicId: this.topicId });
      await topic.save();
    }
  } catch (error) {
    console.error('Error in post-delete hook:', error);
  }
});

commentSchema.methods.editComment = async function(this: CommentDocument, text: string): Promise<boolean> {
  try {
    this.text = text;
    this.timestamp = new Date();
    await this.save();
    return true;
  } catch (error) {
    console.error('Error in editComment:', error);
    return false;
  }
};

export const Topic = model<TopicDocument>('Topic', topicSchema);
export const Comment = model<CommentDocument>('Comment', commentSchema);