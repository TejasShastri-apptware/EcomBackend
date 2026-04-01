import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orgRoutes from "./routes/orgRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orgs", orgRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
    res.send("Furn API is live");
});

export default app;