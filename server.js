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
config({ path: ".env" })

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



server.listen(process.env.PORT, () => {
    // database function calling 
    db();
    console.log("server Started on port " + (process.env.PORT));
})