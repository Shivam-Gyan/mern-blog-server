import express from 'express'
import db from './config/mongoDB.config.js';
import userAuthRouter from './routes/auth.route.js';
import UserRouter from './routes/user.route.js';
import BlogRouter from './routes/blog.route.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import cors from 'cors'
import cloudinary from 'cloudinary'
import fileUpload from 'express-fileupload'
import { config } from 'dotenv';
import CommentRouter from './routes/comment.route.js';
import User from './Schema/User.js';
config({ path: ".env" })

// Auto-cleanup expired integration tokens every hour
const cleanupExpiredTokens = async () => {
    try {
        const result = await User.updateMany(
            { "integrationdetails.expiry_date": { $lte: new Date() } },
            { $pull: { integrationdetails: { expiry_date: { $lte: new Date() } } } }
        );
        if (result.modifiedCount > 0) {
            console.log(`Cleaned up expired tokens from ${result.modifiedCount} user(s)`);
        }
    } catch (err) {
        console.error("Token cleanup error:", err.message);
    }
};

const server = express();


// cloudinary configuration
cloudinary.v2.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

server.use(fileUpload({
    useTempFiles:true,
}))


server.use(express.json());
server.use(express.urlencoded({ extended: true }));
// server.use(cors());
server.use(cors(
    {
        origin: process.env.FRONTEND_URL, 
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
));

// server.options('*', cors()); 



// Authentication handling 
server.use('/api/v1/auth',userAuthRouter)
server.use('/api/v1/blog',BlogRouter)
server.use('/api/v1/user',UserRouter)
server.use('/api/v1/comment',CommentRouter)

server.use(errorMiddleware)



server.listen(process.env.PORT, async () => {
    // database function calling 
    db();
    console.log("server Started on port " + (process.env.PORT));

    // Run cleanup once on startup, then every hour
    await cleanupExpiredTokens();
    setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // every 1 hour
})