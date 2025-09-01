import express from "express";
import { pool } from "../bd.js";

const historyRouter = express.Router();

historyRouter.get("/:roomId", async (req, res) => {
  const roomId = req.params.roomId;

  try {
    const result = await pool.query(
      `SELECT * FROM messages 
         WHERE room_id = $1 `,
      [roomId]
    );

    return res.json({ messages: result.rows });
  } catch (error) {
    console.error("Error fetching message history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default historyRouter;
