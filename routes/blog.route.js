import {
    allLatestBlogsCount, checkIsLikedByUser, countSearchBlog, CreateBlog,
    getBlogById, getBlogBySearch, getLatestBlog,
    getTrendingBlog, likedBlogByUser, UplaodCloudinary,
    
} from "../controller/blog.controller.js";

import express from "express";
import { verifyJWT } from "../utils/jwt.verification.js";


const BlogRouter = express.Router();


BlogRouter
    .post('/get-image-url', UplaodCloudinary)
    .post('/create-blog', verifyJWT, CreateBlog)
    .post('/latest-blogs', getLatestBlog)
    .get('/trending-blogs', getTrendingBlog)
    .post('/search-blogs', getBlogBySearch)
    .post("/all-latest-blogs-count", allLatestBlogsCount)
    .post('/search-blogs-count', countSearchBlog)
    .post('/get-blog', getBlogById)
    .post('/like-blog',verifyJWT,likedBlogByUser)
    .post('/isliked-by-user',verifyJWT,checkIsLikedByUser)
    


export default BlogRouter