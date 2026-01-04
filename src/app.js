import express from 'express'
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from "cors"
import userRouter from './router/userRouter.route.js'
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN, // Ensure this matches your .env key name
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // For storing local assets if needed
app.use(cookieParser());

const PORT = process.env.PORT || 3000

app.use("/api/v1/users", userRouter);

app.listen(PORT, ()=>{
    console.log(`Example app listening on port ${PORT}`)
})