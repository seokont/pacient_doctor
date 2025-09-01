import { pool } from "../bd.js";

export class ChatService {
  async canUserJoinRoom(roomId, userId) {
    const result = await pool.query(
      `SELECT * FROM chat_rooms 
       WHERE id = $1 AND (doctor_id = $2 OR patient_id = $2) 
       AND status = 'active'`,
      [roomId, userId]
    );
    return result.rows.length > 0;
  }

  async createMessage(data) {
    const { roomId, senderId, text, type } = data;

    const result = await pool.query(
      `INSERT INTO messages (room_id, sender_id, message_text, message_type)
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [roomId, senderId, text, type]
    );

    return result.rows[0];
  }

  async getRoomMessages(roomId) {
    const result = await pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.user_type
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.created_at ASC`,
      [roomId]
    );

    return result.rows;
  }

  async markMessagesAsRead(messageIds, userId) {
    await pool.query(
      `UPDATE messages SET is_read = true, read_at = NOW()
       WHERE id = ANY($1) AND sender_id != $2`,
      [messageIds, userId]
    );
  }

  async getOtherRoomParticipant(roomId, currentUserId) {
    const result = await pool.query(
      `SELECT 
        CASE 
          WHEN doctor_id = $2 THEN patient_id
          ELSE doctor_id
        END as other_user_id
       FROM chat_rooms 
       WHERE id = $1`,
      [roomId, currentUserId]
    );

    return result.rows[0]?.other_user_id;
  }

  async updateUserStatus(userId, isOnline) {
    await pool.query(
      `UPDATE users SET is_online = $2, last_online = NOW()
       WHERE id = $1`,
      [userId, isOnline]
    );
  }

  async isUserOnline(userId) {
    const result = await pool.query(
      `SELECT is_online FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0]?.is_online || false;
  }

  async createNotification(data) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)`,
      [data.userId, data.type, data.title, data.message]
    );
  }
}
