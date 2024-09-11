import express from "express";
import { verifyJWT } from "../utils/jwt.verification.js";

import {
    createComment, 
    deleteComment, 
    getBlogComments, 
    getReplies
} from '../controller/comment.controller.js'


const CommentRouter = express.Router();


CommentRouter
    .post('/create-comment', verifyJWT, createComment)
    .post('/get-blog-comments', getBlogComments)
    .post('/get-replies', getReplies)
    .post('/delete-comment', verifyJWT, deleteComment)




export default CommentRouter;