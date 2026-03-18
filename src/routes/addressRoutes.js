const express = require("express");
const router = express.Router();
const addressController = require("../controllers/AddressController");
const injectContext = require("../middleware/injectContext");

// Scope - user and org
router.get("/user/:user_id", injectContext, addressController.getUserAddresses);
router.post("/", injectContext, addressController.addAddress);
router.put("/set-default/:address_id", injectContext, addressController.setDefaultAddress);
router.delete("/:address_id", injectContext, addressController.deleteAddress);

module.exports = router;