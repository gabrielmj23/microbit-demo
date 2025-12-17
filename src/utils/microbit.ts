import { BluetoothConnection } from "../connectors/bluetooth-connector";
import { SerialConnection } from "../connectors/serial-connector";
import type { MicrobitConnection, MessageHandler } from "../types";

// Variable global o en tu gestor de estado (State Manager)
let currentDevice: MicrobitConnection | null = null;

// Función para conectar según el botón que presione el niño
export async function conectarDispositivo(
  tipo: "usb" | "ble",
  onMessage?: MessageHandler
) {
  try {
    // Polimorfismo: Instanciamos la clase adecuada
    if (tipo === "usb") {
      currentDevice = new SerialConnection();
    } else {
      currentDevice = new BluetoothConnection();
    }

    // Conectamos
    await currentDevice.connect();

    // Configurar qué pasa cuando llega un mensaje del micro:bit
    currentDevice.onMessage((mensaje) => {
      if (onMessage) onMessage(mensaje);
      console.log("Recibido del Dataflow Físico:", mensaje);
      // Aquí inyectarías el mensaje en tu Motor de Flujos
      // dataflowEngine.injectData(mensaje);
    });
  } catch (err) {
    console.error("Error de conexión:", err);
    alert("No se pudo conectar. Verifica que el dispositivo esté encendido.");
  }
}

// Ejemplo de enviar un dato desde un bloque visual
export function enviarAlMicrobit(comando: string) {
  if (currentDevice) {
    currentDevice.send(comando); // Ej: "M:100"
  }
}
