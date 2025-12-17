/// <reference types="@types/web-bluetooth" />

import type { MessageHandler, MicrobitConnection } from "../types";

export class BluetoothConnection implements MicrobitConnection {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null; // Para leer
  private txChar: BluetoothRemoteGATTCharacteristic | null = null; // Para escribir
  private messageCallback: MessageHandler | null = null;
  private buffer: string = "";

  // UUIDs oficiales del servicio UART de Nordic (usado por micro:bit)
  private readonly UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  private readonly UART_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Escribir hacia micro:bit
  private readonly UART_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Leer desde micro:bit

  async connect(): Promise<void> {
    // 1. Escanear dispositivos que tengan el servicio UART
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [this.UART_SERVICE_UUID],
    });

    // 2. Conectar al servidor GATT
    this.server = await this.device.gatt!.connect();
    const service = await this.server.getPrimaryService(this.UART_SERVICE_UUID);

    // 3. Obtener características de lectura y escritura
    this.txChar = await service.getCharacteristic(this.UART_TX_UUID);
    this.rxChar = await service.getCharacteristic(this.UART_RX_UUID);

    // 4. Suscribirse a notificaciones (Eventos Push)
    await this.rxChar.startNotifications();
    this.rxChar.addEventListener(
      "characteristicvaluechanged",
      (event: Event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        const decoder = new TextDecoder();
        const text = decoder.decode(value);
        this.handleDataChunk(text);
      }
    );

    console.log("📡 Conectado vía Bluetooth (BLE)");
  }

  async send(data: string): Promise<void> {
    if (!this.txChar) throw new Error("No conectado");
    const encoder = new TextEncoder();
    // Añadimos \n al final
    await this.txChar.writeValue(encoder.encode(data + "\n"));
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
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
