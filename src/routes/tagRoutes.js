import express from 'express';
const router = express.Router();
import tagController from "../controllers/TagController.js";
import injectContext from "../middleware/injectContext.js";

router.post("/", injectContext, tagController.createTag);
router.get("/org", injectContext, tagController.getOrgTags);
router.get("/global", tagController.getAllTags);

export default router;
