const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController");
const injectContext = require("../middleware/injectContext");

// Tenant + user scoped
router.post("/place", injectContext, orderController.placeOrder);
router.get("/my-history", injectContext, orderController.getUserOrdersByOrg);
router.get("/my-detailed-history", injectContext, orderController.getDetailedOrdersByUser);
router.get("/details/:order_id", injectContext, orderController.getDetailedOrderById);

// Admin scoped (org only)
router.get("/org-all", injectContext, orderController.getAllOrdersByOrg);
router.patch("/:order_id/status", injectContext, orderController.updateOrderStatus);

// Global
router.get("/global-all", orderController.getAllOrders);

module.exports = router;