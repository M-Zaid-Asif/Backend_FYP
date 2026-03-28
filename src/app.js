import express from 'express'
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from "cors"
import morgan from 'morgan';
import userRouter from './router/userRouter.route.js'
const app = express()

// console.log("--- SERVER INITIALIZING ---");

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); 
app.use(cookieParser());

// app.use(morgan("dev"))

const PORT = process.env.PORT || 3000

app.use("/api/v1/users", userRouter);

app.listen(PORT, ()=>{
    console.log(`Example app listening on port ${PORT}`)
})