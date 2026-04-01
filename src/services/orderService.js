import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import pool from "../config/db.js";

/**
 * Service to handle complex order logic (e.g. multi-step validation, stock reduction, etc.)
 */
export const createOrder = async (userId, orgId, items) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let totalAmount = 0;

        // 1. Validation & Total Calculation
        for (const item of items) {
            const product = await Product.findByIdUnderOrg(item.productId, orgId);

            if (!product) throw new Error(`Product not found or invalid org: ${item.productId}`);
            if (product.stock_quantity < item.quantity) throw new Error(`Insufficient stock for product: ${product.name}`);

            const itemPrice = product.price;
            totalAmount += itemPrice * item.quantity;
        }

        // 2. Create Order Header via Model
        const orderId = await Order.create({
            user_id: userId,
            org_id: orgId,
            total_amount: totalAmount,
            payment_id: null,
            shipping_address_id: null
        }, connection);

        // 3. Insertion of items & Stock Adjustment
        for (const item of items) {
            const product = await Product.findByIdUnderOrg(item.productId, orgId);

            await Order.addItems(orderId, [{
                product_id: item.productId,
                quantity: item.quantity,
                price: product.price
            }], connection);

            await Product.update(item.productId, orgId, {
                stock_quantity: product.stock_quantity - item.quantity
            }, connection);
        }

        await connection.commit();
        return { orderId, totalAmount };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}