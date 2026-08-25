import mongoose from "mongoose";

const connectDB = async() => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.warn("WARNING: MONGO_URI environment variable is not defined. Database operations will fail.");
            return;
        }
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        console.warn("Continuing server startup despite database connection failure.");
    }
};

export default connectDB;