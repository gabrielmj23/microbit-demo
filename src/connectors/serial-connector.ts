/// <reference types="@types/dom-serial" />

import type { MessageHandler, MicrobitConnection } from "../types";

export class SerialConnection implements MicrobitConnection {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private messageCallback: MessageHandler | null = null;

  // Buffer para reconstruir mensajes fragmentados
  private buffer: string = "";

  async connect(): Promise<void> {
    // 1. Pide al usuario seleccionar el puerto
    this.port = await navigator.serial.requestPort();

    // 2. Abre la conexión (BaudRate 115200 es estándar para micro:bit)
    await this.port.open({ baudRate: 115200 });

    // 3. Configura lector y escritor
    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(this.port.writable);
    this.writer = textEncoder.writable.getWriter();

    // 4. Inicia el bucle de lectura (Listener)
    this.startReading();
    console.log("🔌 Conectado vía Serial (USB)");
  }

  async send(data: string): Promise<void> {
    if (!this.writer) throw new Error("No conectado");
    // Añadimos \n para indicar fin de mensaje
    await this.writer.write(data + "\n");
  }

  async disconnect(): Promise<void> {
    if (this.reader) await this.reader.cancel();
    if (this.writer) await this.writer.close();
    if (this.port) await this.port.close();
  }

  onMessage(callback: MessageHandler): void {
    this.messageCallback = callback;
  }

  // Lógica privada para leer el flujo de datos continuo
  private async startReading() {
    const textDecoder = new TextDecoderStream();
    this.port!.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.handleDataChunk(value);
      }
    } catch (error) {
      console.error("Error leyendo serial:", error);
    }
  }

  // Reconstruye fragmentos: "M1:10" + "0\n" -> "M1:100"
  private handleDataChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");

    // La última parte puede estar incompleta, la guardamos en el buffer
    this.buffer = lines.pop() || "";

    // Procesamos las líneas completas
    lines.forEach((line) => {
      if (this.messageCallback && line.trim()) {
        this.messageCallback(line.trim());
      }
    });
  }
}
