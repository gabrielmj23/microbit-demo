import type { MessageHandler, MicrobitConnection } from "../types";

export class NetworkConnection implements MicrobitConnection {
  private ws: WebSocket | null = null;
  private buffer: string = "";
  private messageCallback: MessageHandler | null = null;
  private readonly url: string;

  constructor(url: string = "ws://localhost:8080/microbit") {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(this.url);

      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        this.handleDataChunk(event.data);
      });
      this.ws.addEventListener("close", () => {
        this.ws = null;
      });
      this.ws.addEventListener("error", (err) => {
        reject(err);
      });
    });
  }

  send(data: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Conexión de red no abierta"));
    }
    const framed = data.trim() + "\n";
    this.ws.send(framed);
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    this.ws = null;
  }

  onMessage(callback: MessageHandler): void {
    this.messageCallback = callback;
  }

  private handleDataChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.trim() && this.messageCallback) {
        this.messageCallback(line.trim());
      }
    }
  }
}
