import { ChatService } from "./chatService.js";

const chatService = new ChatService();

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.data.user.id);

    socket.on("join_chat", async (data) => {
      const dating = JSON.parse(data);
      const { roomId } = dating;
      const userId = socket.data.user.id;

      try {
        const canJoin = await chatService.canUserJoinRoom(roomId, userId);

        console.log("User joining chat:", canJoin);
        if (canJoin) {
          socket.join(`room_${roomId}`);

          socket.emit("join_success", { roomId: parseInt(roomId) });

          const messages = await chatService.getRoomMessages(roomId);
          socket.emit("message_history", messages);
        } else {
          socket.emit("join_error", { message: "Access denied" });
        }
      } catch (error) {
        socket.emit("join_error", { message: "Error joining room" });
      }
    });
    socket.on("ping", (data) => {
      console.log("ping received:", data);
      socket.emit("pong", { message: "pong", received: data });
    });

    socket.on("send_message", async (data) => {
      const dating = JSON.parse(data);
      const { roomId, text, type = "text" } = dating;
      const senderId = socket.data.user.id;

      try {
        const message = await chatService.createMessage({
          roomId,
          senderId,
          text,
          type,
        });

        io.to(`room_${roomId}`).emit("new_message", message);

        const otherUserId = await chatService.getOtherRoomParticipant(
          roomId,
          senderId
        );
        if (otherUserId) {
          const isOnline = await chatService.isUserOnline(otherUserId);
          if (!isOnline) {
            await chatService.createNotification({
              userId: otherUserId,
              type: "new_message",
              title: "Новое сообщение",
              message: `У вас новое сообщение в чате`,
            });
          }
        }
      } catch (error) {
        socket.emit("message_error", { message: "Error sending message" });
      }
    });

    socket.on("mark_as_read", async (data) => {
      const { messageIds } = data;
      const userId = socket.data.user.id;

      try {
        await chatService.markMessagesAsRead(messageIds, userId);

        messageIds.forEach((messageId) => {
          socket.broadcast.emit("messages_read", {
            messageId,
            userId,
          });
        });
      } catch (error) {
        socket.emit("read_error", {
          message: "Error marking messages as read",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.data.user.id);
      chatService.updateUserStatus(socket.data.user.id, false);
    });

    socket.on("user_online", () => {
      chatService.updateUserStatus(socket.data.user.id, true);
    });

    socket.on("typing_start", (data) => {
      socket.to(`room_${data.roomId}`).emit("user_typing", {
        userId: socket.data.user.id,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (database) => {
      socket.to(`room_${data.roomId}`).emit("user_typing", {
        userId: socket.data.user.id,
        isTyping: false,
      });
    });
  });
};
