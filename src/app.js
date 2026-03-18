const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orgRoutes = require("./routes/orgRoutes");
const addressRoutes = require("./routes/addressRoutes");
const tagRoutes = require("./routes/tagRoutes");

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

app.get("/", (req, res) => {
    res.send("Furn API is live");
});

module.exports = app;
