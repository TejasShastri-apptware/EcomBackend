import express from 'express';
const router = express.Router();
import orgController from "../controllers/OrgController.js";

router.post("/", orgController.createOrganization);
router.get("/", orgController.getAllOrganizations);
router.get("/resolve/:slug", orgController.getOrgBySlug);
router.get("/:id", orgController.getOrganizationById);

export default router;