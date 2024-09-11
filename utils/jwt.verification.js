import ErrorHandler from "../middleware/error.middleware.js"
import jwt from 'jsonwebtoken'


export const verifyJWT=async(req,res,next)=>{

    const authHeader=req.headers['authorization']

    // authHeader is like [Bearer ajshjahbdhsbdyabjbdabdjbsjbd] in Headers
    const token=authHeader && authHeader.split(" ")[1]

    if(token==null){
        return next(new ErrorHandler("No access token",401))
    }
    jwt.verify(token,process.env.SECRET_KEY,(err,user)=>{
        if(err){
            return next(new ErrorHandler("Invalid access token",403))
        }
        req.user=user._id
        next()
    })

    

}