import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Address } from "../models/Address.js";
import pool from "../config/db.js";

/**
 * POST /orders/place
 */
const placeOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orgId = req.org_id;
        const userId = req.user_id;
        const { shipping_address_id, payment_id } = req.body;

        // 1. Address Ownership Check
        const address = await Address.findByIdUnderOrg(shipping_address_id, orgId);
        if (!address || address.user_id !== userId) {
            throw new Error("Invalid or unauthorized shipping address.");
        }

        // 2. Fetch Cart Items with FOR UPDATE lock
        const cartItems = await Cart.getItemsForCheckout(userId, orgId, connection);
        if (cartItems.length === 0) throw new Error("Empty Cart");

        let totalAmount = 0;
        for (const item of cartItems) {
            if (item.stock_quantity < item.quantity) {
                throw new Error(`Insufficient stock for product ID: ${item.product_id}`);
            }
            totalAmount += item.price * item.quantity;
        }

        // 3. Create Order
        const orderId = await Order.create({
            user_id: userId,
            org_id: orgId,
            total_amount: totalAmount,
            payment_id,
            shipping_address_id
        }, connection);

        // 4. Record Items & Deduct Stock
        await Order.addItems(orderId, cartItems, connection);

        for (const item of cartItems) {
            // Atomic deduction
            const updated = await Product.update(item.product_id, orgId, {
                stock_quantity: item.stock_quantity - item.quantity
            }, connection);

            if (!updated) {
                throw new Error(`Concurrency error: Stock changed for product ${item.product_id}`);
            }
        }

        // 5. Clear Cart
        await Cart.clear(userId, orgId, connection);

        await connection.commit();
        res.status(201).json({ order_id: orderId, total_amount: totalAmount });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

/**
 * GET /orders (User's order history)
 */
const getUserOrdersByOrg = async (req, res) => {
    try {
        const orgId = req.org_id;
        const userId = req.user_id;

        const orders = await Order.findByUser(userId, orgId);
        res.json(orders);
    } catch (error) {
        console.error("Error in getUserOrdersByOrg:", error);
        res.status(500).json({ message: "Error fetching user orders" });
    }
};

/**
 * GET /orders/global (Global Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAllGlobal();
        res.json(orders);
    } catch (error) {
        console.error("Error in getAllOrders:", error);
        res.status(500).json({ message: "Error fetching all orders" });
    }
};

/**
 * GET /orders/org-all (Org Admin)
 */
const getAllOrdersByOrg = async (req, res) => {
    try {
        const orgId = req.org_id;
        const orders = await Order.findAllByOrg(orgId);
        res.json(orders);
    } catch (error) {
        console.error("Error in getAllOrdersByOrg:", error);
        res.status(500).json({ message: "Error fetching all orders by org" });
    }
};

/**
 * GET /orders/my-detailed-history (Detailed breakdown for customer)
 */
const getDetailedOrdersByUser = async (req, res) => {
    try {
        const userId = req.user_id;
        const orgId = req.org_id;

        const orders = await Order.findDetailedByUser(userId, orgId);
        res.status(200).json({ "orders": orders });

    } catch (error) {
        console.error("Error in getDetailedOrdersByUser:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

/**
 * GET /orders/:order_id
 */
const getOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;
        const orgId = req.org_id;

        const order = await Order.findById(order_id, orgId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const items = await Order.findItemsByOrderId(order_id);

        res.json({ order, items });
    } catch (error) {
        console.error(`Error in getOrderById for ${req.params.order_id}:`, error);
        res.status(500).json({ message: "Error fetching order by ID findById" });
    }
};

/**
 * GET /orders/details/:order_id (Admin Detail View)
 */
const getDetailedOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;
        const orgId = req.org_id;

        const detail = await Order.findDetailedById(order_id, orgId);
        if (!detail) return res.status(404).json({ message: "Order not found" });

        res.json(detail);
    } catch (error) {
        console.error(`Error in getDetailedOrderById for ${req.params.order_id}:`, error);
        res.status(500).json({ message: "Error fetching order details findDetailedById" });
    }
};

/**
 * PATCH /orders/:order_id/status (Admin approval/cancellation)
 */
const updateOrderStatus = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const orgId = req.org_id;
        const { order_id } = req.params;
        const { status } = req.body;

        const ALLOWED = ['completed', 'cancelled'];
        if (!ALLOWED.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Allowed values: ${ALLOWED.join(', ')}`
            });
        }

        await connection.beginTransaction();

        await Order.updateStatus(order_id, orgId, status, connection);

        await connection.commit();
        res.json({ order_id: Number(order_id), order_status: status });

    } catch (error) {
        await connection.rollback();
        console.error('updateOrderStatus error:', error);
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message || 'Failed to update order status.' });
    } finally {
        connection.release();
    }
};

export default {
    placeOrder,
    getUserOrdersByOrg,
    getAllOrders,
    getAllOrdersByOrg,
    getDetailedOrdersByUser,
    getOrderById,
    getDetailedOrderById,
    updateOrderStatus
}