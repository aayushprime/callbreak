type EventData = any;

export type RoomConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export class Room {
  private connection: WebSocket | null = null;

  id: string;
  name: string;
  roomId: string;
  public status: RoomConnectionStatus = "disconnected";
  public errorMessage: string | null = null;

  static create(id: string, name: string, roomId: string) {
    return new Room(id, name, roomId);
  }

  constructor(
    id: string,
    name: string,
    roomId: string,
    readonly noCreate: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.roomId = roomId;
  }

  private listener?: (event: EventData, ack: () => void) => void;
  private backlog: EventData[] = [];
  private maxBacklog = 100;
  private idCounter = 0;

  emit(type: string, payload: any) {
    const event: EventData = {
      id: this.idCounter++,
      type,
      payload,
      ts: Date.now(),
    };

    this.store(event);
    if (this.listener) {
      this.deliver(event);
    }
  }

  subscribe(listener: (event: EventData, ack: () => void) => void) {
    this.listener = listener;
    for (const event of [...this.backlog]) {
      this.deliver(event);
    }

    return () => {
      this.listener = undefined;
    };
  }

  private deliver(event: EventData) {
    this.listener?.({ type: event.type, payload: event.payload }, () => {
      this.backlog = this.backlog.filter((e) => e.id !== event.id);
    });
  }

  private store(event: EventData) {
    this.backlog.push(event);
    if (this.backlog.length > this.maxBacklog) {
      this.backlog.shift();
    }
  }

  getBacklog(): EventData[] {
    return [...this.backlog];
  }

  connect() {
    if (this.connection) return;

    this.status = "connecting";
    this.errorMessage = null;
    this.emit("status", this.status);

    const queryParams = new URLSearchParams({
      id: this.id,
      roomId: this.roomId,
      name: this.name,
      noCreate: this.noCreate.toString(),
    }).toString();

    this.connection = new WebSocket(
      `ws://${process.env.NEXT_PUBLIC_BACKEND_URL}/?${queryParams}`
    );

    this.connection.onopen = () => {
      this.status = "connected";
      this.emit("status", this.status);
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

  retry() {
    this.disconnect();
    this.connect();
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

  send(message: "startGame" | "playAgain") {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify({ type: message, scope: "room" }));
    } else {
      console.warn("Cannot send message, WebSocket not connected.");
    }
  }
}
