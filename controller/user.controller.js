import ErrorHandler from "../middleware/error.middleware.js";
import bcrypt from 'bcrypt'
import User from "../Schema/User.js";
import Notification from '../Schema/Notification.js';
import Blog from '../Schema/Blog.js'
import Comment from '../Schema/Comment.js'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'


export const getUserBySearch=async(req,res,next)=>{
    const {query}=req.body;

    await User.find({"personal_info.username":new RegExp(query,"i")})
    .limit(10)
    .select("personal_info.username personal_info.fullname personal_info.profile_img -_id")
    .then((users)=>{
        return res.status(200).json({users})
    })
    .catch(err=>{
        return next(new ErrorHandler(err.message,500))
    })
}

export const CheckAnyNotification=async(req,res,next)=>{

    let user_id=req.user

    try {
        const result = await Notification.exists({
            notification_for: user_id,
            seen: false,
            user: { $ne: user_id }
        });
    
        if (result) {
            return res.status(200).json({
                new_notification: true
            });
        } else {
            return res.status(200).json({
                new_notification: false
            });
        }
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
    
}


export const getNotificationByFilter=async(req,res,next)=>{

    let user_id=req.user

    let {page,filter,deletedDocCount}=req.body

    let maxLimit=10;

    let findQuery={notification_for:user_id,user:{$ne:user_id}}

    let skip=(page-1)*maxLimit

    if(filter!='all'){
        findQuery.type=filter
    }

    if(deletedDocCount){
        skip -=deletedDocCount;
    }

    await Notification.find(findQuery)
    .skip(skip)
    .limit(maxLimit)
    .populate('blog','title blog_id')
    .populate('user',"personal_info.username personal_info.fullname personal_info.profile_img")
    .populate('comment','comment')
    .populate('replied_on_comment',"comment")
    .populate('reply',"comment")
    .sort({createdAt:-1})
    .select("createdAt type seen reply")
    .then(async(notifications)=>{

       await Notification.updateMany(findQuery,{seen:true})
        .skip(skip)
        .limit(maxLimit)
        .catch(err=>{
            return next(new ErrorHandler(err.message, 500));

        })

        return res.status(200).json({
           notifications
        });
    }).catch(err=>{
        return next(new ErrorHandler(err.message, 500));
    })
}


export const countFilterNotification=async(req,res,next)=>{

    let user_id=req.user;

    let {filter}=req.body;

    let findQuery={notification_for:user_id,user:{$ne:user_id}}

    if(filter!='all'){
        findQuery.type=filter
    }

    await Notification.countDocuments(findQuery)
    .then((totalDocs)=>{
        return res.status(200).json({
            totalDocs
        })
    }).catch(err=>{
        return next(new ErrorHandler(err.message, 500));
    })


}


export const userWrittenBlogs=async(req,res,next)=>{

    let user_id=req.user

    let {page,draft,query,deletedDocCount}=req.body

    let maxLimit=5;
    let skip=(page-1)*maxLimit;

    if(deletedDocCount){
        skip-=deletedDocCount
    }

    await Blog.find({
        author:user_id,
        draft,
        title:new RegExp(query,'i')
        // here 'i' means incase sensitive
    })
    .skip(skip)
    .limit(maxLimit)
    .sort({
        PublishedAt:-1
    })
    .select("title banner publishedAt blog_id activity des draft -_id")
    .then((docs)=>{
        return res.status(200).json({
            success:true,
            message:"Number of Document is "+(docs.length),
            docs
        })
    })
    .catch(err=>{
        return next(new ErrorHandler(err.message,500))
    })

}


export const countUserWrittenBlog=async(req,res,next)=>{

    let user_id=req.user

    let {draft,query}=req.body

    await Blog.countDocuments({
        author:user_id,
        draft,
        title:new RegExp(query,'i')
    })
    .then((countDoc)=>{
        return res.status(200).json({
            totalDocs:countDoc
        })
    })
    .catch(err=>{
        return next(new ErrorHandler(err.message,500));
    })
}

export const deleteUserBlog=async(req,res,next)=>{
    
    let user_id=req.user
    
    let {blog_id}=req.body
    
    
    await Blog.findOneAndDelete({blog_id})
    .then(async(blog)=>{
        
        await Notification.deleteMany({blog:blog._id})
        .catch(err=>{
            return next(new ErrorHandler(err.message,500));
        })
        
        await Comment.deleteMany({blog_id:blog._id})
        .catch(err=>{
            return next(new ErrorHandler(err.message,500));
        })
        
        
        await User.findOneAndUpdate({_id:user_id},{
            $pull:{blog:blog._id},$inc:{"account_info.total_post":-1}
        })
        .catch(err=>{
            return next(new ErrorHandler(err.message,500));
        })
        
        return res.status(200).json({
            success:true,
            message:"blog deleted "
        })
        
        
    })
    .catch(err=>{
        return next(new ErrorHandler(err.message,500));
    })

}



// generate a bcrypt integration token for third party integration like agentic_ai blog application 

export const generateIntegrationToken = async (req, res, next) => {

    const user_id = req.user;
    const { token_name, expiry_days = 7 } = req.body;

    if (!token_name || !token_name.trim().length) {
        return next(new ErrorHandler("Please provide a token name", 400));
    }

    if (![7, 14, 30].includes(expiry_days)) {
        return next(new ErrorHandler("expiry_days must be 7, 14, or 30", 400));
    }

    try {
        // Generate a raw token: nanoid + timestamp for uniqueness
        const rawToken = `featherfables_${nanoid(32)}_${Date.now()}_${expiry_days}d`;

        // Hash it with bcrypt (store hash in DB, return raw to user)
        const hashedToken = await bcrypt.hash(rawToken, 10);

        const user = await User.findById(user_id);
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        if(user.integration_token_limit <= 0){
            return next(new ErrorHandler("Integration token limit reached. Please use another account to get Access of integration Token or purchase membership to use", 403));
        }

        // Calculate expiry date for JWT
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiry_days);

        // Generate JWT access token with user_id, token_name, token, and expiry details
        const accessToken = jwt.sign(
            {
                random_id: user_id,
                token_name: token_name.trim(),
                token: hashedToken,
                expiry_days,
                expiry_date: expiryDate.toISOString(),
            },
            process.env.SECRET_KEY,
            { expiresIn: `${expiry_days}d` }
        );

        // Push new token — expiry_date is auto-set by pre-save hook
        user.integrationdetails.push({
            token: hashedToken,
            token_name: token_name.trim(),
            access_token: accessToken,
            expiry_days,
        });

        user.integration_token_limit -= 1; // Update token count

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Integration token generated successfully",
            access_token: accessToken,
        });

    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};

export const getIntegrationTokens = async (req, res, next) => {
    const user_id = req.user;

    try {
        const user = await User.findById(user_id).select("integrationdetails integration_token_limit");
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        const tokens = user.integrationdetails.map((t) => ({
            _id: t._id,
            token_name: t.token_name,
            access_token: t.access_token,
            expiry_days: t.expiry_days,
            expiry_date: t.expiry_date,
        }));

        return res.status(200).json({
            success: true,
            tokens,
            integration_token_limit: user.integration_token_limit,
        });
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};

export const deleteIntegrationToken = async (req, res, next) => {
    const user_id = req.user;
    const { token_id } = req.body;

    if (!token_id) {
        return next(new ErrorHandler("Please provide a token_id", 400));
    }

    try {
        const user = await User.findById(user_id);
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        const tokenExists = user.integrationdetails.id(token_id);
        if (!tokenExists) {
            return next(new ErrorHandler("Token not found", 404));
        }

        user.integrationdetails.pull(token_id);
        user.integration_token_limit += 1;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Integration token deleted successfully",
        });
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};