import express from "express";

import {
    CheckAnyNotification, countFilterNotification,
    countUserWrittenBlog,
    getNotificationByFilter, getUserBySearch,
    userWrittenBlogs
} from "../controller/user.controller.js";

import { verifyJWT } from '../utils/jwt.verification.js'

const UserRouter = express.Router();

UserRouter
    .post('/search-users', getUserBySearch)
    .get('/new-notification', verifyJWT, CheckAnyNotification)
    .post('/get-filter-notification', verifyJWT, getNotificationByFilter)
    .post('/count-notifications', verifyJWT, countFilterNotification)
    .post('/user-blogs', verifyJWT, userWrittenBlogs)
    .post('/count-user-blogs', verifyJWT, countUserWrittenBlog)


export default UserRouter;