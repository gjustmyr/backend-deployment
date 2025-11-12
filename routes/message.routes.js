const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const messageController = require("../controllers/message.controller");

// Get all conversations for the current user
router.get("/conversations", authMiddleware, messageController.getConversations);

// Get messages for a specific conversation
router.get("/messages/:partnerId", authMiddleware, messageController.getMessages);

// Get available chat partners
router.get("/partners", authMiddleware, messageController.getChatPartners);

module.exports = router;

