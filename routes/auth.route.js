import express from "express";
import { ChangePassword, getProfile, UpdateImage, updateProfile, userSignIn, userSignUp } from "../controller/auth.controller.js";
import {verifyJWT} from '../utils/jwt.verification.js'

const userAuthRouter=express.Router();



userAuthRouter
.post('/signup',userSignUp)
.post('/signin',userSignIn)
.post('/get-profile',getProfile)
.post('/change-password',verifyJWT,ChangePassword)
.patch('/upload-image',verifyJWT,UpdateImage)
.patch('/update-profile',verifyJWT,updateProfile)


export default userAuthRouter;