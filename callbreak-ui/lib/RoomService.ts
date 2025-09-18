import { ClientMessage } from "room-service";
import { EventEmitter } from "events";

export type RoomConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

class RoomService extends EventEmitter {
  private static instance: RoomService;
  private connection: WebSocket | null = null;
  public status: RoomConnectionStatus = "disconnected";
  public errorMessage: string | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  connect(id: string, name: string, roomId: string, noCreate: boolean = false, roomFee: number = 0) {
    if (this.connection) return;

    this.status = "connecting";
    this.errorMessage = null;
    this.emit("status", this.status);

    const queryParams = new URLSearchParams({
      id,
      name,
      roomId,
      noCreate: noCreate.toString(),
      roomFee: roomFee.toString(),
    }).toString();

    this.connection = new WebSocket(
      `ws://${process.env.NEXT_PUBLIC_BACKEND_URL}/?${queryParams}`
    );

    this.connection.onopen = () => {
      this.status = "connected";
      this.emit("status", this.status);
      this.emit("open");
    };

    this.connection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "error") {
          this.errorMessage =
            message.message ||
            message.payload?.message ||
            message.payload ||
            "Unknown error from server";
          this.status = "error";
          this.emit("error", { message: this.errorMessage });
        } else {
          this.emit(message.type, message.payload);
        }
      } catch (e) {
        console.error("failed to parse message", event.data);
        console.error("Error", e);
      }
    };

    this.connection.onclose = (event) => {
      if (this.status !== "error") {
        this.status = "disconnected";
        this.emit("status", this.status);
      }
      this.emit("close", { wasClean: event.wasClean });
    };

    this.connection.onerror = (err) => {
      this.errorMessage = "WebSocket error. Is the server running?";
      this.status = "error";
      this.emit("error", { message: this.errorMessage });
      this.connection?.close();
    };
  }

  disconnect() {
    if (this.connection) {
      this.connection.onopen = null;
      this.connection.onmessage = null;
      this.connection.onclose = null;
      this.connection.onerror = null;
      this.connection.close();
      this.connection = null;
    }
    this.status = "disconnected";
    this.emit("status", this.status);
  }

  send(message: ClientMessage) {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message, WebSocket not connected.");
    }
  }
}

export default RoomService.getInstance();
