const express = require("express");
const router = express.Router();
const orgController = require("../controllers/OrgController");

router.post("/", orgController.createOrganization);
router.get("/", orgController.getAllOrganizations);
router.get("/resolve/:slug", orgController.getOrgBySlug);
router.get("/:id", orgController.getOrganizationById);

module.exports = router;