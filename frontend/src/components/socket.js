// socket.js
import { io } from "socket.io-client";

const socket = io(`http://${window.location.hostname}:6502`);
export default socket;
