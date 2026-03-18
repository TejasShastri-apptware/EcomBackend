const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const injectContext = require("../middleware/injectContext");

router.post("/login", injectContext, userController.login);
router.post("/register", injectContext, userController.createUser);
router.get("/org", injectContext, userController.getAllUsersUnderOrg);
router.get("/org/:id", injectContext, userController.getUserByIdUnderOrg);
router.put("/org/:id", injectContext, userController.updateUser);
router.delete("/org/:id", injectContext, userController.deleteUser);

// Global routes — no tenant scoping needed
router.get("/global", userController.getAllUsers);
router.get("/global/:id", userController.getUserById);

module.exports = router;