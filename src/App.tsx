import { useMemo, useState } from "react";
import "./App.css";
import { conectarDispositivo, enviarAlMicrobit } from "./utils/microbit";

type ConnectionMode = "usb" | "ble";
type ConnectionState = "idle" | "connecting" | "connected";

const quickCommands = [
  { label: "Motor 1 -> 100%", value: "M1:100" },
  { label: "Motor 2 -> 50%", value: "M2:50" },
  { label: "Mostrar texto", value: "TXT:Hola" },
  { label: "LED nivel 75%", value: "LED:75" },
];

function App() {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("usb");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [logEntries, setLogEntries] = useState<string[]>([
    "Listo para conectar",
  ]);
  const [command, setCommand] = useState("");

  const statusText = useMemo(() => {
    switch (connectionState) {
      case "connecting":
        return "Conectando al micro:bit";
      case "connected":
        return "Conectado y listo";
      default:
        return "Desconectado";
    }
  }, [connectionState]);

  const connectLabel = useMemo(() => {
    if (connectionState === "connecting") return "Conectando...";
    if (connectionState === "connected") return "Reiniciar conexión";
    return "Iniciar conexión";
  }, [connectionState]);

  const appendLog = (entry: string) =>
    setLogEntries((prev) => {
      const next = [...prev, entry];
      return next.length > 60 ? next.slice(next.length - 60) : next;
    });

  const handleConnect = async () => {
    if (connectionState === "connecting") return;
    setConnectionState("connecting");
    appendLog(
      `Intentando conectar por ${
        connectionMode === "usb" ? "USB" : "Bluetooth"
      }`
    );

    try {
      await conectarDispositivo(connectionMode, (mensaje) => {
        appendLog(`micro:bit -> ${mensaje}`);
      });
      setConnectionState("connected");
      appendLog("Conexion establecida.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "sin detalles";
      appendLog(`No se pudo conectar: ${message}`);
      setConnectionState("idle");
    }
  };

  const handleSendCommand = async (value?: string) => {
    const payload = (value ?? command).trim();
    if (!payload) return;
    if (connectionState !== "connected") {
      appendLog("Conecta un micro:bit antes de enviar comandos.");
      return;
    }

    try {
      enviarAlMicrobit(payload);
      appendLog(`-> ${payload}`);
      if (!value) setCommand("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "desconocido";
      appendLog(`Falló el envío: ${message}`);
    }
  };

  const connected = connectionState === "connected";

  return (
    <main className="app-shell">
      <div className="orb orb-one" aria-hidden="true"></div>
      <div className="orb orb-two" aria-hidden="true"></div>
      <div className="glass-panel">
        <header className="hero">
          <p className="hero-tag">Dataflow Fisico</p>
          <h1>Controla tu micro:bit en vivo</h1>
          <p>
            Alterna entre USB y Bluetooth, envía comandos y monitorea las
            respuestas del micro:bit desde una sola pantalla.
          </p>
        </header>

        <section className="control-grid">
          <div className="card connection-card">
            <div className="card-header">
              <h2>Conexión</h2>
              <span className={`status-pill status-${connectionState}`}>
                {statusText}
              </span>
            </div>

            <div className="method-selector">
              {["usb", "ble"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`method-chip ${
                    connectionMode === mode ? "active" : ""
                  }`}
                  onClick={() => setConnectionMode(mode as ConnectionMode)}
                  disabled={connectionState === "connecting"}
                >
                  {mode === "usb" ? "Cable USB" : "Bluetooth (BLE)"}
                </button>
              ))}
            </div>

            <button
              className="primary-action"
              onClick={handleConnect}
              disabled={connectionState === "connecting"}
            >
              {connectLabel}
            </button>
          </div>

          <div className="card command-card">
            <div className="card-header">
              <h2>Enviar comando</h2>
              <p>
                Escribe un comando textual estándar (por ejemplo, M1:100) o usa
                los accesos rápidos.
              </p>
            </div>

            <div className="command-row">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendCommand();
                  }
                }}
                placeholder="Ej: M1:100"
                aria-label="Comando para micro:bit"
              />
              <button
                type="button"
                className="send-button"
                onClick={() => handleSendCommand()}
                disabled={!connected}
              >
                Enviar
              </button>
            </div>

            <div className="quick-commands">
              {quickCommands.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="chip"
                  onClick={() => handleSendCommand(item.value)}
                  disabled={!connected}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card log-card">
          <div className="card-header">
            <h2>Registro</h2>
            <p aria-live="polite">Las últimas interacciones aparecen aquí.</p>
          </div>

          <div className="log-list" role="log">
            {logEntries.map((entry, index) => (
              <p key={`${entry}-${index}`}>{entry}</p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
