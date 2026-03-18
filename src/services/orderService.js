const pool = require("../config/db");

exports.createOrder = async (userId, items) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let totalAmount = 0

        //validation
        for(const item of items) {
            const [productRows] = await connection.query(
                "select price, discount from product where id = ?", [item.productId]
            );

            if(productRows.length === 0) throw new Error(`Product not found : ${item.productId}`);

            const product = productRows[0];
            const itemPrice = product.price - product.discount;
            totalAmount += itemPrice * item.quantity;
        }
        const [orderRes] = await connection.query(
            "INSERT INTO user_order (user_id, total, status) VALUES (?, ?, 'PENDING')",
            [userId, totalAmount]
        );

        const orderId = orderRes.insertId;

        //insertion of items
        for(const item of items) {
            const [productRows] = await connection.query(
                "select price, discount from product where id = ?", [item.productId]
            );

            const product = productRows[0];
            const itemPrice = product.price - product.discount;

            await connection.query(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)",
                [orderId, item.productId, item.quantity, itemPrice]
            );
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


module.exports = {createOrder};