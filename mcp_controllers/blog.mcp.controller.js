
import { convertMarkdownToEditorJs } from "../utils/mdToEditor.js";
import { nanoid } from "nanoid";
import Blog from "../Schema/Blog.js";
import User from "../Schema/User.js";
import ErrorHandler from "../middleware/error.middleware.js";


export const AutomaticBlogCreation = async (req, res, next) => {

    const authorId = req.user;

    const {
        title = 'Untitled Blog',
        tags = ['auto-generated'],
        des = '',  
        markdown = `# Hello World\nThis is a blog created from markdown!`,
        draft
    } = req.body

    try {
        const editorData = convertMarkdownToEditorJs(markdown);

        // Generate blog_id
        const blog_id = title.replace(/[^a-zA-z0-9]/g, " ").replace(/\s+/g, "-").trim() + nanoid();

        const blog = new Blog({
            title,
            banner: "",
            blog_id,
            des,
            content: editorData,
            tags: tags || ["ai","auto-generated"],
            author: authorId,
            draft: draft || true,
        });

        await blog.save();

        await User.findOneAndUpdate(
            { _id: authorId },
            {
                $inc: { "account_info.total_posts": 1 },
                $push: { blogs: blog._id },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Congratulations! Your blog has been successfully created and saved as a draft to Feather Fables.",
            blog_id: blog.blog_id,
        });
    } catch (err) {
        return next(new ErrorHandler("Failed to convert/save markdown blog: " + err.message, 500));
    }
};
