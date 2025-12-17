/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// 1. AL RECIBIR DATOS POR BLUETOOTH
// En lugar de 'serial.onDataReceived', usamos el evento UART de Bluetooth
bluetooth.onUartDataReceived(
  serial.delimiters(Delimiters.NewLine),
  function () {
    // Leemos hasta el salto de línea, igual que en USB
    mensaje = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine));
    mensaje = mensaje.trim();
    // 2. Lógica del Despachador (Idéntica a la anterior)
    // Puedes agregar más comandos aquí (Ej: "M:" para motores)
    if (mensaje.includes("TXT:")) {
      contenido = mensaje.substr(4);
      basic.showString(contenido);
    } else if (mensaje.includes("ICON:")) {
      // Ejemplo extra: Si recibes ICON:1, muestra un corazón
      basic.showIcon(IconNames.Heart);
    }
  }
);
// AL RECIBIR DATOS DEL NAVEGADOR
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
  // 1. Leer el mensaje hasta el salto de línea
  mensaje = serial.readUntil(serial.delimiters(Delimiters.NewLine));
  mensaje = mensaje.trim();
  // 3. Verificar el encabezado
  if (mensaje.includes("TXT:")) {
    // CORRECCIÓN: Usamos .substr(4)
    // Esto dice: "Crea una nueva cadena empezando desde el caracter número 4 hasta el final"
    // "TXT:" tiene 4 letras (índices 0, 1, 2, 3), así que empezamos en el 4.
    contenido2 = mensaje.substr(4);
    basic.showString(contenido2);
  }
});
let contenido2 = "";
let contenido = "";
let mensaje = "";
// AL INICIAR
// CORRECCIÓN IMPORTANTE: Cambié 'basic.forever' por código de inicio directo.
// La configuración del Serial solo debe hacerse UNA vez al principio, no repetirse por siempre.
serial.redirectToUSB();
serial.setBaudRate(BaudRate.BaudRate115200);
bluetooth.startUartService();
// Feedback visual para saber que ya arrancó
basic.showIcon(IconNames.Yes);
basic.pause(500);
basic.clearScreen();

const sendToHost = (text: string) => {
  const framed = text.trim() + "\n";
  serial.writeString(framed);
  bluetooth.uartWriteString(framed);
};

input.onButtonPressed(Button.A, () => {
  sendToHost("EVENT:Boton A presionado");
  basic.showString("A");
});

input.onButtonPressed(Button.B, () => {
  sendToHost("EVENT:Boton B presionado");
  basic.showString("B");
});
