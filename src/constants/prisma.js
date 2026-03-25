import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/index.js';

// 1. Setup connection
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Connection logic
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Database connection established successfully via Prisma.");
  } catch (error) {
    console.error("Failed to connect to the database:");
    console.error(error);
    process.exit(1); 
  }
}

connectDB();

// 2. Disconnect Logic
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down...`);
  
  try {
    await prisma.$disconnect();
    await pool.end();
    
    console.log("Database disconnected from the Application");
    process.exit(0);
  } catch (err) {
    console.error("Error during disconnection:", err);
    process.exit(1);
  }
};

// 3. Listen for termination signals (Ctrl+C or Kill command)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default prisma;