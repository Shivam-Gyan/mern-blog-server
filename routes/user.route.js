import express from "express";

import {
    CheckAnyNotification, countFilterNotification,
    countUserWrittenBlog,
    deleteUserBlog,
    generateIntegrationToken,
    getIntegrationTokens,
    deleteIntegrationToken,
    getNotificationByFilter, getUserBySearch,
    userWrittenBlogs
} from "../controller/user.controller.js";

import { verifyJWT } from '../middleware/jwt.verification.js'

const UserRouter = express.Router();

UserRouter
    .post('/search-users', getUserBySearch)
    .get('/new-notification', verifyJWT, CheckAnyNotification)
    .post('/get-filter-notification', verifyJWT, getNotificationByFilter)
    .post('/count-notifications', verifyJWT, countFilterNotification)
    .post('/user-blogs', verifyJWT, userWrittenBlogs)
    .post('/count-user-blogs', verifyJWT, countUserWrittenBlog)
    .post('/delete-user-blog',verifyJWT,deleteUserBlog)
    .post('/generate-token', verifyJWT, generateIntegrationToken)
    .get('/get-tokens', verifyJWT, getIntegrationTokens)
    .post('/delete-token', verifyJWT, deleteIntegrationToken)


export default UserRouter;