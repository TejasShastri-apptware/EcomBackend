import express from 'express';
const router = express.Router();
import addressController from "../controllers/AddressController.js";
import injectContext from "../middleware/injectContext.js";

// Scope - user and org (all require context)
router.get("/user/:user_id", injectContext, addressController.getUserAddresses);
router.post("/", injectContext, addressController.addAddress);
router.put("/set-default/:address_id", injectContext, addressController.setDefaultAddress);
router.put("/:address_id", injectContext, addressController.updateAddress);
router.delete("/:address_id", injectContext, addressController.deleteAddress);

export default router;