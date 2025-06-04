// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:6502");
export default socket;
