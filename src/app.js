import express from 'express'
import 'dotenv/config';
import userRouter from './router/userRouter.route.js'
const app = express()

app.use(express.json());

const PORT = process.env.PORT || 3000

app.use("/users", userRouter);

app.listen(PORT, ()=>{
    console.log(`Example app listening on port ${PORT}`)
})