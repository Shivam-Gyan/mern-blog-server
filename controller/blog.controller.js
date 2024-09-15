import cloudinary from 'cloudinary'
import ErrorHandler from '../middleware/error.middleware.js';
import { nanoid } from 'nanoid'
import Blog from '../Schema/Blog.js'
import User from '../Schema/User.js'
import Notification from '../Schema/Notification.js';
import Comment from '../Schema/Comment.js'

// create Url of Uploaded image
export const UplaodCloudinary = async (req, res, next) => {

    if (!req.files || Object.keys(req.files).length == 0) {
        return next(new ErrorHandler("Please uplaod and image", 404));
    }
    const { image } = req.files;
    let cloudinaryResponse;

    try {
        cloudinaryResponse = await cloudinary.uploader.upload(
            image.tempFilePath
        );
    } catch (error) {
        return next(new ErrorHandler("something went wrong while uploading banner ", 500))
    }


    return res.status(200).json({
        success: true,
        message: "upload successfull",

        image_url: cloudinaryResponse.secure_url
    })
}


// crating controller to create a blog and save to server on publish


export const CreateBlog = async (req, res, next) => {

    let authorId = req.user;

    let { title, banner, content, tags, des, draft, id } = req.body

    if (!title.length) {
        return next(new ErrorHandler("provide a title to blog", 403))
    }
    if (!draft) {

        if (!des.length || des.length > 200) {
            return next(new ErrorHandler("des should be 200 words only ", 403))
        }

        if (!banner.length) {
            return next(new ErrorHandler("add a banner to blog to publish it", 403))
        }
        if (!content.blocks.length) {
            return next(new ErrorHandler("add blog content to publish it", 403))
        }
        if (!tags.length || tags.length > 10) {
            return next(new ErrorHandler("please add tags to publish it, Maximium 10 ", 403))
        }
    }

    // to convert tags in lowercase in other to search it 

    tags = tags.map(tag => tag.toLowerCase().trim());

    // instead of using object _id of each block blog ,
    // we can create our own blogId which protect data from breaching

    // if we have id which is blog_id from edit blog then return as blog_id
    let blog_id = id || title.replace(/[^a-zA-z0-9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid()


    if (id) {

        await Blog.findOneAndUpdate({ blog_id }, { title, banner, des, content, tags, draft: draft ? draft : false })
            .then((_) => {
                return res.status(200).json({ id: blog_id })
            })
            .catch((err) => {
                return next(new ErrorHandler(err.message, 500))
            })


    } else {

        let blog = new Blog({
            title,
            banner,
            blog_id,
            des,
            content,
            tags,
            author: authorId,
            draft: Boolean(draft)
        })

        await blog.save()
            .then(async (data) => {
                // if the post is in draft then not increment the total no of post of author else increase by 1
                let authorPosts = draft ? 0 : 1
                await User.findOneAndUpdate(
                    { _id: authorId },
                    {
                        $inc: { "account_info.total_posts": authorPosts },
                        $push: { "blogs": data._id }
                    }
                ).then(user => {
                    return res.status(200).json({
                        id: blog.blog_id
                    })
                }).catch(err => {
                    return next(new ErrorHandler("failed to upload post", 500))
                })

            })
            .catch(err => {
                return next(new ErrorHandler(err.message, 500))
            })
    }



}



export const getLatestBlog = async (req, res, next) => {
    let maxLimit = 5;

    let { page } = req.body

    await Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "publishedAt": -1 })
        .select("blog_id title des activity banner tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs })
        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })
}

export const allLatestBlogsCount = async (req, res, next) => {
    await Blog.countDocuments({ draft: false })
        .then((count) => {
            return res.status(200).json({
                totalDocs: count
            })
        })
        .catch((err) => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const getTrendingBlog = async (req, res, next) => {

    let maxLimit = 5;

    await Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "activity.total_likes": -1, "activity.total_reads": -1, "publishedAt": -1 })
        .select("blog_id title  publishedAt -_id")
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs })
        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const getBlogBySearch = async (req, res, next) => {

    const { tag, query, page, author, limit, eliminate_blog } = req.body

    let findQuery;

    if (tag) {

        // elimimnate and return the blog which is not equal to currently open blog

        findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } }

    } else if (query) {

        // find and related word in title same as query ,"i" determine it case be case sensitive
        findQuery = { title: new RegExp(query, "i"), draft: false }
    } else if (author) {
        findQuery = { author, draft: false }
    }

    const maxLimit = limit ? limit : 2;

    await Blog.find(findQuery)
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "publishedAt": -1 })
        .select("blog_id title des activity banner tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs })
        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const countSearchBlog = async (req, res, next) => {

    const { tag, query, author } = req.body;

    let fetchedQuery;
    if (tag) {
        fetchedQuery = { draft: false, tags: tag }
    } else if (query) {
        fetchedQuery = { title: new RegExp(query, "i"), draft: false }
    } else if (author) {
        fetchedQuery = { author, draft: false }
    }

    await Blog.countDocuments(fetchedQuery)
        .then((count) => {
            return res.status(200).json({
                totalDocs: count
            })
        })
        .catch((err) => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const getBlogById = async (req, res, next) => {
    let { blog_id, draft, mode } = req.body

    let increment = mode != 'edit' ? 1 : 0;
    await Blog.findOneAndUpdate({ blog_id }, { $inc: { "activity.total_reads": increment } })
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img ")
        .select("title des content banner activity publishedAt blog_id tags")
        .then(async (blog) => {

            await User.findOneAndUpdate({ "personal_info.username": blog.author.personal_info.username }, {
                $inc: {
                    "account_info.total_reads": increment
                }
            })
                .catch(err => {
                    return next(new ErrorHandler(err.message, 500))
                })

            if (blog.draft && !draft) {
                return next(new ErrorHandler("you cannot access draft blog ", 500))
            }

            return res.status(200).json(blog)
        })
        .catch((err) => {
            return next(new ErrorHandler(err.message, 500))
        })

}


// working from here

export const likedBlogByUser = async (req, res, next) => {

    let user_id = req.user

    const { _id, isLikedByUser } = req.body

    let increment = !isLikedByUser ? 1 : -1;

    await Blog.findOneAndUpdate({ _id }, { $inc: { "activity.total_likes": increment } })
        .then(async (blog) => {

            if (!isLikedByUser) {
                let liked = new Notification({
                    type: "like",
                    blog: _id,
                    notification_for: blog.author,
                    user: user_id,
                })

                await liked.save().then(() => {
                    return res.status(200).json({
                        success: true,
                        liked_by_user: true
                    })
                }).catch((err) => {
                    return next(new ErrorHandler(err.message, 500))
                })
            } else {

                await Notification.findOneAndDelete({ blog: _id, type: "like", user: user_id })
                    .then(() => {
                        return res.status(200).json({
                            success: true,
                            liked_by_user: false
                        })
                    })
                    .catch((err) => {

                        return next(new ErrorHandler(err.message, 500))
                    })
            }

        }).catch((err) => {
            return next(new ErrorHandler(err.message, 500))
        })
}


export const checkIsLikedByUser = async (req, res, next) => {
    let user_id = req.user

    let { _id } = req.body


    await Notification.exists({ blog: _id, type: "like", user: user_id })
        .then((result) => {
            return res.status(200).json({ result: result != null ? true : false })
        })
        .catch(err => {
            return next(new ErrorHandler(err.message, 500))
        })
}






