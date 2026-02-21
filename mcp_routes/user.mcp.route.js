import express from 'express';
import {getProfile} from '../mcp_controllers/user.mcp.controller.js'
import {verifyIntegrationToken} from '../middleware/jwt.verification.js'
import { updateProfile } from '../controller/auth.controller.js';
import { CheckAnyNotification } from '../controller/user.controller.js';

const MCPUserRouter = express.Router();


MCPUserRouter
    .get('/get-user-profile-info', verifyIntegrationToken, getProfile)
    .patch('/update-profile', verifyIntegrationToken, updateProfile)
    .get('/check-any-notification', verifyIntegrationToken, CheckAnyNotification)


export default MCPUserRouter;