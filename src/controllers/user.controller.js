import prisma from '../constants/prisma.js'

const count = async (req, res) => {
  try {
    const userCount = await prisma.user.count(); 
    res.json({ 
        success: true, 
        count: userCount 
    });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
}

export {count};