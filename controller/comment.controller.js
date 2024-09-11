import ErrorHandler from "../middleware/error.middleware.js";
import Blog from "../Schema/Blog.js";
import Comment from "../Schema/Comment.js";
import Notification from "../Schema/Notification.js";

export const createComment = async (req, res, next) => {

    let user_id = req.user;

    let { _id, comment, replying_to, blog_author,notification_id } = req.body


    if (!comment.trim().length) {
        return next(new ErrorHandler("write something to leave comment", 403))
    }

    let CommentObj = new Comment({
        blog_id: _id, blog_author, comment, commented_by: user_id
    })

    // adding the parent of reply into comment schema model to update the data

    if (replying_to) {
        CommentObj.parent = replying_to
        CommentObj.isReply=true


    }

    await CommentObj.save().then(async (commentFile) => {
        let { comment, commentedAt, children } = commentFile


        // updating blog model
        await Blog.findOneAndUpdate({ _id }, { $push: { "comments": commentFile._id }, $inc: { "activity.total_comments": 1, "activity.total_parent_comments": replying_to ? 0 : 1 } })
            .catch(err => {
                return next(new ErrorHandler(err.message, 500))
            })

        // creating notification model for new comment 
        let notificationObj = new Notification({
            type: replying_to ? "reply" : "comment",
            blog: _id,
            notification_for: blog_author,
            user: user_id,
            comment: commentFile._id
        })

        if (replying_to) {
            notificationObj.replied_on_comment = replying_to;

            await Comment.findOneAndUpdate({ _id: replying_to }, { $push: { "children": commentFile._id } })
                .then(replyToComment => {
                    notificationObj.notification_for = replyToComment.commented_by
                })

            if(notification_id){

                await Notification.findOneAndUpdate({_id:notification_id},{reply:commentFile._id})
                .catch((err)=>{
                    return next(new ErrorHandler(err.message, 500))

                })
            }
        }

        await notificationObj.save().then((notify) => {
        }).catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })

        return res.status(200).json({
            comment,
            commentedAt,
            children,
            _id: commentFile._id,
            user_id
        })
    }).catch(err => {
        return next(new ErrorHandler(err.message, 500))
    })

}


export const getBlogComments = async (req, res, next) => {

    const { blog_id, skip } = req.body

    const maxLimit = 5;
    await Comment.find({ blog_id, isReply: false })
        .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
        .skip(skip)
        .limit(maxLimit)
        .sort({
            "commentedAt": -1
        })
        .then((comments) => {
            return res.status(200).json(comments)
        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const getReplies = async (req, res, next) => {

    let { _id, skip } = req.body;

    let maxLimit = 5;

    await Comment.findOne({ _id })
        .populate({
            path: "children",
            options: {
                limit: maxLimit,
                skip: skip,
                sort: {
                    "commentedAt": -1
                },
                populate: {
                    path: 'commented_by',
                    select: "personal_info.profile_img personal_info.username"
                },
                select: "-blog_id -updatedAt"
            }
        }).then((doc) => {
            return res.status(200).json({ replies: doc.children })
        }).catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })

}

const deleteSpecificCommentById = async (_id) => {

    await Comment.findOneAndDelete({ _id })
        .then(async (comment) => {

            if (comment.parent) {
                await Comment.findOneAndUpdate({ _id: comment.parent }, { $pull: { "children": _id } })
                    .catch(err => {
                        console.log(err.message)
                    })
            }

            await Notification.findOneAndDelete({ comment: _id })
                .catch(err => {
                    console.log(err.message)
                })

            await Notification.findOneAndUpdate({ reply: _id },{$unset:{reply:1}})
                .catch(err => {
                    console.log(err.message)
                })

            await Blog.findOneAndUpdate(
                {
                    _id: comment.blog_id
                },
                {
                    $pull: {
                        "comments": _id
                    },
                    $inc: {
                        "activity.total_comments": -1,
                        "activity.total_parent_comments": comment.parent ? 0 : -1
                    }
                }).then((_) => {
                    if (comment.children.length) {
                        comment.children.map(replies => {
                            deleteSpecificCommentById(replies)
                        })
                    }
                }).catch(err => {
                    console.log(err.message)
                })

        }).catch(err => {
            console.log(err.message)

        })
}

export const deleteComment = async (req, res, next) => {

    let user_id = req.user;

    let { _id } = req.body

    await Comment.findOne({ _id })
        .then(async (comment) => {

            if (user_id == comment.commented_by || user_id == comment.blog_author) {

                await deleteSpecificCommentById(_id)

                return res.status(200).json({
                    success: true,
                    message: "deleted successfully"
                })

            } else {
                return next(new ErrorHandler("not access to delete comment", 403))
            }

        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 403))

        })

}