const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB successfully!");
  } catch (err) {
    console.log("Error connecting to DB!");
    console.log(
      "-----------------------------------------------------------------"
    );
    console.log(err);
  }
};

module.exports = connectDB;
