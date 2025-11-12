const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skill.controller");

// Get all skills
router.get("/", skillController.getAll);

// Create or get skill (auto-add if not exists)
router.post("/create-or-get", skillController.createOrGet);

// Create a new skill
router.post("/", skillController.create);

module.exports = router;

