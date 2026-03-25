const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const injectContext = require("../middleware/injectContext");

// Self-service profile (logged-in user)
router.get("/me", injectContext, userController.getMe);
router.put("/me", injectContext, userController.updateMe);

// Auth
router.post("/login", injectContext, userController.login);
router.post("/register", injectContext, userController.createUser);

// Org-scoped (admin use)
router.get("/org", injectContext, userController.getAllUsersUnderOrg);
router.get("/org/:id", injectContext, userController.getUserByIdUnderOrg);
router.put("/org/:id", injectContext, userController.updateUser);
router.delete("/org/:id", injectContext, userController.deleteUser);

// Global routes — no tenant scoping needed
router.get("/global", userController.getAllUsers);
router.get("/global/:id", userController.getUserById);

module.exports = router;