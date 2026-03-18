const express = require("express");
const router = express.Router();
const tagController = require("../controllers/TagController");
const injectContext = require("../middleware/injectContext");

router.post("/", injectContext, tagController.createTag);
router.get("/org", injectContext, tagController.getOrgTags);
router.get("/global", tagController.getAllTags);

module.exports = router;
