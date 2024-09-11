import ErrorHandler from "../middleware/error.middleware.js";
import bcrypt from 'bcrypt'
import User from "../Schema/User.js";
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'


// ragex for email and password verification 
var emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
var passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password



// user signup functionality 
export const userSignUp = async (req, res, next) => {

    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
        return next(new ErrorHandler("please fill the complete form"))
    }

    if (fullname.length < 3) {
        return next(new ErrorHandler("fullname must be atleast 3 letter long", 403))
    }

    if (!email.length) {
        return next(new ErrorHandler("please enter an email", 403))
    }
    if (!emailRegex.test(email)) {
        return next(new ErrorHandler("invalid email", 403))
    }
    if (!passwordRegex.test(password)) {
        return next(new ErrorHandler("password should be 6 to 20 character long with a numeric,1 lowercase and 1 uppercase", 403))
    }

    const formatUserData = (user) => {
        const access_token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY)

        return ({
            access_token,
            profile_img: user.personal_info.profile_img,
            fullname: user.personal_info.fullname,
            username: user.personal_info.username,
            email: user.personal_info.email
        })
    }

    bcrypt.hash(password, 10, async (err, hash) => {

        if (err) {
            return next(new ErrorHandler(err.message, 400))
        }

        // checking the case of same username existence and altering the case of matching 
        let username = email.split("@")[0]
        await User.exists({ "personal_info.username": username }).then(result => result ? username += nanoid().substring(0, 5) : "")


        const user = new User({
            personal_info: {
                fullname,
                email,
                password: hash,
                username
            }
        })

        await user
            .save()
            .then(user => {

                return res.status(200).json({
                    success: true,
                    message: "congratulation for being the part of community ",
                    user: formatUserData(user)
                })
            })

            .catch(err => {
                if (err.code == 11000) {
                    return next(new ErrorHandler("user already exist ", 500))
                }
                return next(new ErrorHandler(err.message, 403))
            })

    })
}


export const userSignIn = async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorHandler("please fill the complete form"))
    }

    if (!email.length) {
        return next(new ErrorHandler("please enter an email", 403))
    }
    if (!emailRegex.test(email)) {
        return next(new ErrorHandler("invalid email", 403))
    }
    if (!passwordRegex.test(password)) {
        return next(new ErrorHandler("password should be 6 to 20 character long with a numeric,1 lowercase and 1 uppercase", 403))
    }

    const formatUserData = (user) => {
        const access_token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY)

        return ({
            access_token,
            profile_img: user.personal_info.profile_img,
            fullname: user.personal_info.fullname,
            username: user.personal_info.username,
            email: user.personal_info.email
        })
    }
    let user;
    try {
        user = await User.findOne({ "personal_info.email": email })
    } catch (error) {
        return next(new ErrorHandler("Internal server error ",500))
    }

    if (!user) {
        return next(new ErrorHandler("user not registered", 404))
    }


    bcrypt.compare(password, user.personal_info.password, (err, result) => {
        if(err){
            return next(new ErrorHandler("something went wrong",404))
        }
        if(!result){
            return next(new ErrorHandler("password incorrect",404))
        }
        return res.status(200).json({
            success: true,
            message: "Welcome back Buddy",
            user: formatUserData(user)
        })


    })
}


export const getProfile=async(req,res,next)=>{

    const {username}=req.body


    await User.findOne({"personal_info.username":username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((user)=>{
        return res.status(200).json(user)
    })
    .catch((err)=>{
        return next(new ErrorHandler(err.message,404))
    })
}



export const ChangePassword=async(req,res,next)=>{
    let user_id=req.user

    let {currentPassword,newPassword}=req.body

    if(!currentPassword.length || !newPassword.length){

        return next(new ErrorHandler(" fill the complete form",500))
    }


    if (!passwordRegex.test(currentPassword) ||!passwordRegex.test(newPassword)) {
        return next(new ErrorHandler("password should be 6 to 20 character long with a numeric,1 lowercase and 1 uppercase", 403))
    }

    await User.findOne({_id:user_id})
    .then(user=>{
        let {personal_info:{password:prevPassword}}=user

        bcrypt.compare(currentPassword,prevPassword,(err,result)=>{

            if(err){
                return next(new ErrorHandler("some error occured try sometime later ",500))
            }

            if(!result){
                return next(new ErrorHandler("Incorrect current password",403))
            }

            bcrypt.hash(newPassword,10,async(err,hash_password)=>{

                if(err){
                    return next(new ErrorHandler("some error occured try sometime later ",500))
                }
                await User.findOneAndUpdate({_id:user_id},{"personal_info.password":hash_password})
                .then((_)=>{
                    return res.status(200).json({
                        success:true,
                        message:"Password change successful"
                    })
                }).catch(err=>{
                    return next(new ErrorHandler("some error occured try sometime later ",500))
                })
            })
        })
    }).catch(err=>{
        return next(new ErrorHandler("User Not found",404))
    })

}


export const UpdateImage=async(req,res,next)=>{
    let user_id=req.user

    let {image_url}=req.body


    await User.findOneAndUpdate({_id:user_id},{"personal_info.profile_img":image_url})
    .then((_)=>{
        return res.status(200).json({
            success:true,
            message:"profile image Updated "
        })
    }).catch((_)=>{
        return next(new ErrorHandler("failed to update the image",500))
    })
}

export const updateProfile=async(req,res,next)=>{


    let user_id=req.user
    let bioLimit=200;

    let {username,bio,social_links}=req.body

    if(bio.length>bioLimit){
        return next(new ErrorHandler(`bio must be ${bioLimit} characters long`,403))
    }

    if(username.length<3){
        return next(new ErrorHandler("username atleast 3 characters long",403))
    }

    let socialLinkArr=Object.keys(social_links)

    try {
        for(let i=0;i<socialLinkArr.length;i++){
            if(social_links[socialLinkArr[i]].length){
                let hostname=new URL(social_links[socialLinkArr[i]]).hostname

                if(!hostname.includes(`${socialLinkArr[i]}.com`) && socialLinkArr[i]!='website'){
                    return next(new ErrorHandler(`${socialLinkArr[i]} link is invalid`,403))
                }
            }
        }
        
    } catch (error) {
        return next(new ErrorHandler("you must provide full social links with http(s) included ",403))
    }

    let UpdateObj={
        "personal_info.username":username,
        "personal_info.bio":bio,
        social_links
    }

    await User.findOneAndUpdate({_id:user_id},UpdateObj,{
        runValidators:true
    }).then((_)=>{
        return res.status(200).json({
            success:true,
            message:"profile updated",
            username
        })
    }).catch(err=>{
        if(err.code==11000){
            return next(new ErrorHandler(`username already exist @${username} `,403))
        }
        return next(new ErrorHandler(err.message,403))
    })

}