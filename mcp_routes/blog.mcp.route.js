import express from 'express';
import { AutomaticBlogCreation } from '../mcp_controllers/blog.mcp.controller.js';
import {verifyIntegrationToken} from '../middleware/jwt.verification.js'


const MCPBlogRouter = express.Router();




MCPBlogRouter
    .post('/auto-blog',verifyIntegrationToken, AutomaticBlogCreation)


export default MCPBlogRouter;