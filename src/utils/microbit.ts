import { BluetoothConnection } from "../connectors/bluetooth-connector";
import { SerialConnection } from "../connectors/serial-connector";
import type { MessageHandler, MicrobitConnection } from "../types";

export function createMicrobitConnection(
  tipo: "usb" | "ble"
): MicrobitConnection {
  return tipo === "usb" ? new SerialConnection() : new BluetoothConnection();
}

export async function connectAndMonitor(
  connection: MicrobitConnection,
  onMessage: MessageHandler
) {
  connection.onMessage((mensaje) => {
    onMessage(mensaje);
    console.log("Recibido del Dataflow Fisico:", mensaje);
  });
  await connection.connect();
}
