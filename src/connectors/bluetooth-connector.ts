/// <reference types="@types/web-bluetooth" />

import * as microbit from "microbit-web-bluetooth";
import type { MessageHandler, MicrobitConnection } from "../types";

type UartServiceLike = {
  addEventListener: (
    type: "receiveText",
    listener: (event: { detail?: unknown }) => void
  ) => void;
  sendText: (value: string) => Promise<void>;
};

export class BluetoothConnection implements MicrobitConnection {
  private device: BluetoothDevice | null = null;
  private uartService: UartServiceLike | null = null;
  private messageCallback: MessageHandler | null = null;
  private buffer: string = "";

  async connect(): Promise<void> {
    // 1. Descubrir micro:bit usando la libreria
    this.device = await microbit.requestMicrobit(window.navigator.bluetooth);
    if (!this.device) {
      throw new Error("No se selecciono un micro:bit");
    }

    // 2. Obtener servicios y UART
    const services = await microbit.getServices(this.device);
    const uartService = services.uartService as UartServiceLike | undefined;
    if (!uartService) {
      throw new Error("El servicio UART no esta disponible");
    }
    this.uartService = uartService;

    // 3. Suscribirse a eventos UART
    uartService.addEventListener(
      "receiveText",
      (event: { detail?: unknown }) => {
        const text =
          typeof event.detail === "string"
            ? event.detail
            : String(event.detail ?? "");
        this.handleDataChunk(text);
      }
    );

    console.log("Conectado via Bluetooth (BLE)");
  }

  async send(data: string): Promise<void> {
    if (!this.uartService) throw new Error("No conectado");
    await this.uartService.sendText(data + "\n");
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.uartService = null;
  }

  onMessage(callback: MessageHandler): void {
    this.messageCallback = callback;
  }

  private handleDataChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (this.messageCallback && line.trim()) {
        this.messageCallback(line.trim());
      }
    }
  }
}
