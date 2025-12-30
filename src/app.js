import express from 'express'
import 'dotenv/config';
import prisma from './constants/prisma.js'
const app = express()
const port = 8000

app.get('/', async (req, res) => {
  // Just to test if it works
  const count = await prisma.user.count(); 
  res.send(`User count: ${count}`);
});

app.listen(port, ()=>{
    console.log(`Example app listening on port ${port}`)
})