import jwt from "jsonwebtoken";

export const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.headers.authorization?.split(" ")[1];
    console.log("Socket token:", token);
    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, "your-secret-key");
    console.log("Authenticated user:", decoded);
    socket.data.user = decoded;
    next();
  } catch (error) {
    console.error("JWT error:", error.message);
    next(new Error("Authentication error"));
  }
};
