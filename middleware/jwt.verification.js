import ErrorHandler from "./error.middleware.js"
import jwt from 'jsonwebtoken'
import User from '../Schema/User.js'


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


// Verify integration token (JWT) - extracts user_id, token_name, token, expiry details
export const verifyIntegrationToken = async (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(" ")[1];

    if (!accessToken) {
        return next(new ErrorHandler("No integration token provided", 401));
    }

    try {
        // Verify and decode the JWT
        const decoded = jwt.verify(accessToken, process.env.SECRET_KEY);

        // Check if token expiry_date has passed
        if (new Date(decoded.expiry_date) <= new Date()) {
            return next(new ErrorHandler("Integration token has expired", 403));
        }

        // Verify the token exists in the user's integrationdetails in DB
        const user = await User.findById(decoded.random_id);
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        const tokenRecord = user.integrationdetails.find(
            (t) => t.token === decoded.token && t.token_name === decoded.token_name
        );

        if (!tokenRecord) {
            return next(new ErrorHandler("Integration token is revoked or invalid", 403));
        }

        // Attach decoded info to request
        req.user = decoded.random_id;
        req.integration = {
            token_name: decoded.token_name,
            token: decoded.token,
            expiry_days: decoded.expiry_days,
            expiry_date: decoded.expiry_date,
        };

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return next(new ErrorHandler("Integration token has expired", 403));
        }
        return next(new ErrorHandler("Invalid integration token", 403));
    }
};