import { Document, Schema, Model, Connection, Types, model } from 'mongoose';
import { IModels } from './index';

export interface IComment {
  _id: any;
  replyToId?: string;
  postId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  createdById: string;
}

export type CommentDocument = IComment & Document;
export interface ICommentModel extends Model<CommentDocument> {
  findByIdOrThrow(_id: string): Promise<CommentDocument>;
  createComment(c: Omit<IComment, '_id'>): Promise<CommentDocument>;
  updateComment(_id: string, content: string): Promise<CommentDocument>;
  deleteComment(_id: string): Promise<CommentDocument>;
}

export const commentSchema = new Schema<CommentDocument>(
  {
    replyToId: { type: Types.ObjectId, index: true },
    postId: { type: Types.ObjectId, index: true },
    content: { type: String, required: true },
    createdById: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

export const generateCommentModel = (
  subdomain: string,
  con: Connection,
  models: IModels
): void => {
  class CommentModel {
    public static async findByIdOrThrow(_id: string): Promise<CommentDocument> {
      const comment = await models.Comment.findById(_id);
      if (!comment) {
        throw new Error(`Comment with \`{ "_id" : "${_id}"}\` doesn't exist`);
      }
      return comment;
    }
    public static async createComment(
      c: Omit<IComment, '_id'>
    ): Promise<CommentDocument> {
      const res = await models.Comment.create(c);
      await models.Post.reCalculateCommentCount(c.postId);
      return res;
    }
    public static async updateComment(
      _id: string,
      content: string
    ): Promise<CommentDocument> {
      const comment = await models.Comment.findByIdOrThrow(_id);
      comment.content = content;
      await comment.save();
      return comment;
    }

    public static async deleteComment(_id: string): Promise<CommentDocument> {
      const deletedComment = await models.Comment.findByIdOrThrow(_id);

      const idsToDelete = [_id];
      let findReplies = [_id];

      while (findReplies?.length) {
        const replies = await models.Comment.find({
          replyToId: { $in: findReplies }
        }).lean();
        const replyIds = replies.map(reply => reply._id);
        idsToDelete.push(...replyIds);
        findReplies = replyIds;
      }

      await models.Comment.deleteMany({ _id: { $in: idsToDelete } });
      await models.Post.reCalculateCommentCount(deletedComment.postId);
      return deletedComment;
    }
  }
  commentSchema.loadClass(CommentModel);

  models.Comment = con.model<CommentDocument, ICommentModel>(
    'forum_comments',
    commentSchema
  );
};
