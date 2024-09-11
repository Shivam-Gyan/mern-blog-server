import ErrorHandler from "../middleware/error.middleware.js";
import bcrypt from 'bcrypt'
import User from "../Schema/User.js";
import Notification from '../Schema/Notification.js';
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