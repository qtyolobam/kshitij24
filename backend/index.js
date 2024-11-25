//Dependencies
const express = require("express");
const connectDB = require("./db");
const cors = require("cors");
require("dotenv").config();

//Routers
const userAuthRouter = require("./routes/userAuth.router");
const userRouter = require("./routes/user.router");
const adminAuthRouter = require("./routes/adminAuth.router");
const adminRouter = require("./routes/admin.router");

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

app.use("/api/user/auth", userAuthRouter);
app.use("/api/user/", userRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/admin/", adminRouter);

app.listen(PORT, () => {
  console.log(`Server up on port ${PORT}!`);
  connectDB();
});
