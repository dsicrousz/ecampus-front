import { io, Socket } from "socket.io-client";
import { env } from "@/env";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(env.VITE_APP_BACKEND, {
      transports: ['websocket'],
      reconnection: true,
    });
  }
  return socketInstance;
};

export const signSocket = (compteId: string): void => {
  const socket = getSocket();
  socket.emit('sign', { compteId });
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
