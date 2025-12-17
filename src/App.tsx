import { useState } from "react";
import "./App.css";
import { connectAndMonitor, createMicrobitConnection } from "./utils/microbit";
import type { MicrobitConnection } from "./types";

type ConnectionMode = "usb" | "ble";
type ConnectionState = "idle" | "connecting" | "connected";

type DeviceSlot = {
  id: number;
  mode: ConnectionMode;
  state: ConnectionState;
  log: string[];
  command: string;
  connection: MicrobitConnection | null;
};

let nextSlotId = 1;
const createDeviceSlot = (): DeviceSlot => ({
  id: nextSlotId++,
  mode: "usb",
  state: "idle",
  log: ["Listo para conectar"],
  command: "",
  connection: null,
});

const quickCommands = [
  { label: "Motor 1 -> 100%", value: "M1:100" },
  { label: "Motor 2 -> 50%", value: "M2:50" },
  { label: "Mostrar texto", value: "TXT:Hola" },
  { label: "LED nivel 75%", value: "LED:75" },
];

const statusLabel = (state: ConnectionState) => {
  switch (state) {
    case "connecting":
      return "Conectando";
    case "connected":
      return "Conectado";
    default:
      return "Desconectado";
  }
};

const connectLabel = (state: ConnectionState) => {
  if (state === "connecting") return "Conectando...";
  if (state === "connected") return "Reiniciar conexion";
  return "Iniciar conexion";
};

function App() {
  const [slots, setSlots] = useState<DeviceSlot[]>(() => [createDeviceSlot()]);

  const pushSlotLog = (slotId: number, message: string) =>
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? { ...slot, log: [...slot.log, message].slice(-60) }
          : slot
      )
    );

  const handleModeChange = (slotId: number, mode: ConnectionMode) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, mode } : slot))
    );
  };

  const handleConnect = async (slotId: number) => {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot || slot.state === "connecting") return;

    if (slot.connection) {
      try {
        await slot.connection.disconnect();
      } catch {
        // ignore cleanup failures
      }
    }

    setSlots((prev) =>
      prev.map((item) =>
        item.id === slotId ? { ...item, state: "connecting" } : item
      )
    );
    pushSlotLog(
      slotId,
      `Intentando conectar por ${slot.mode === "usb" ? "USB" : "Bluetooth"}`
    );

    const connection = createMicrobitConnection(slot.mode);

    try {
      await connectAndMonitor(connection, (mensaje) => {
        pushSlotLog(slotId, `micro:bit -> ${mensaje}`);
      });

      setSlots((prev) =>
        prev.map((item) =>
          item.id === slotId
            ? { ...item, state: "connected", connection }
            : item
        )
      );
      pushSlotLog(slotId, "Conexion establecida.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "sin detalles";
      setSlots((prev) =>
        prev.map((item) =>
          item.id === slotId
            ? { ...item, state: "idle", connection: null }
            : item
        )
      );
      pushSlotLog(slotId, `No se pudo conectar: ${message}`);
    }
  };

  const handleCommandChange = (slotId: number, value: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, command: value } : slot
      )
    );
  };

  const handleSendCommand = async (slotId: number, value?: string) => {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;

    const payload = (value ?? slot.command).trim();
    if (!payload) return;

    if (slot.state !== "connected" || !slot.connection) {
      pushSlotLog(slotId, "Conecta un micro:bit antes de enviar comandos.");
      return;
    }

    try {
      await slot.connection.send(payload);
      pushSlotLog(slotId, `-> ${payload}`);
      if (!value) {
        setSlots((prev) =>
          prev.map((item) =>
            item.id === slotId ? { ...item, command: "" } : item
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "desconocido";
      pushSlotLog(slotId, `Falló el envio: ${message}`);
    }
  };

  const addDevice = () => setSlots((prev) => [...prev, createDeviceSlot()]);

  return (
    <main className="app-shell">
      <div className="orb orb-one" aria-hidden="true"></div>
      <div className="orb orb-two" aria-hidden="true"></div>
      <div className="glass-panel">
        <header className="hero">
          <p className="hero-tag">Dataflow Fisico</p>
          <h1>Controla multiples micro:bits</h1>
          <p>
            Cada tarjeta representa una placa independiente; elige el puerto
            ideal, lanza comandos y observa la bitacora propia de cada
            micro:bit.
          </p>
        </header>

        <section className="devices-section">
          <div className="section-title">
            <div>
              <h2>Micro:bits activos</h2>
              <p>
                Administra multiples flotas y monitorea cada una por separado.
              </p>
            </div>
            <button type="button" className="ghost-button" onClick={addDevice}>
              + Nuevo micro:bit
            </button>
          </div>

          <div className="device-grid">
            {slots.map((slot) => (
              <article className="device-card card" key={slot.id}>
                <header className="device-card__header">
                  <div>
                    <p className="device-label">Micro:bit {slot.id}</p>
                    <p className="device-subtitle">
                      {slot.mode === "usb" ? "Cable USB" : "Bluetooth (BLE)"}
                    </p>
                  </div>
                  <span className={`status-pill status-${slot.state}`}>
                    {statusLabel(slot.state)}
                  </span>
                </header>

                <div className="method-selector">
                  {(["usb", "ble"] as ConnectionMode[]).map((mode) => (
                    <button
                      key={`${slot.id}-${mode}`}
                      type="button"
                      className={`method-chip ${
                        slot.mode === mode ? "active" : ""
                      }`}
                      onClick={() => handleModeChange(slot.id, mode)}
                      disabled={slot.state === "connecting"}
                    >
                      {mode === "usb" ? "Cable USB" : "Bluetooth (BLE)"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="primary-action"
                  onClick={() => handleConnect(slot.id)}
                  disabled={slot.state === "connecting"}
                >
                  {connectLabel(slot.state)}
                </button>

                <div className="command-section">
                  <div className="command-row">
                    <input
                      value={slot.command}
                      onChange={(event) =>
                        handleCommandChange(slot.id, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSendCommand(slot.id);
                        }
                      }}
                      placeholder="Ej: M1:100"
                      aria-label="Comando para micro:bit"
                    />
                    <button
                      type="button"
                      className="send-button"
                      onClick={() => handleSendCommand(slot.id)}
                      disabled={slot.state !== "connected"}
                    >
                      Enviar
                    </button>
                  </div>

                  <div className="quick-commands">
                    {quickCommands.map((item) => (
                      <button
                        key={`${slot.id}-${item.value}`}
                        type="button"
                        className="chip"
                        onClick={() => handleSendCommand(slot.id, item.value)}
                        disabled={slot.state !== "connected"}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="log-card">
                  <div className="card-header">
                    <h3>Registro</h3>
                    <p aria-live="polite">
                      Ultimas interacciones del dispositivo.
                    </p>
                  </div>
                  <div className="log-list" role="log">
                    {slot.log.map((entry, index) => (
                      <p key={`${slot.id}-${index}-${entry}`}>{entry}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
