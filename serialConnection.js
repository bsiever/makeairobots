let open;
let videoInputs = 0;
const videoDevices = [];
const audioDevices = [];

let uBitDevice;
let rxCharacteristic;

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

$('#requestPortButton, #reconnect-port').click(async (event) => {
    fireClickEvent("btn_click", true, "connect_microbit")
    document.body.style.display = 'none';
    try {
        uBitDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: "uBit" }, 
                      { namePrefix: "BBC" }],
            optionalServices: [UART_SERVICE_UUID],
        });
        uBitDevice.addEventListener('gattserverdisconnected', microbitDisconnect);
        await connectMicrobit();

        if (pageNumber < maxPageNum) {
            changePage(true);
        } else {
            closePort(1);
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return;
        } else {
            // List cameras and microphones.
            let vidCount = 1;
            let audCount = 1;
            navigator.mediaDevices
                .enumerateDevices()
                .then(function (mediaDevices) {
                    mediaDevices.forEach((mediaDevice) => {
                        if (mediaDevice.kind === 'videoinput') {
                            videoDevices.push(mediaDevice);
                            const option = document.createElement('option');
                            option.value = mediaDevice.deviceId;
                            const label = mediaDevice.label || `Camera ${vidCount++}`;
                            const textNode = document.createTextNode(label);
                            option.appendChild(textNode);
                            $('#cam').append(option);
                        } else if (mediaDevice.kind === 'audioinput') {
                            audioDevices.push(mediaDevice);
                            const option = document.createElement('option');
                            option.value = mediaDevice.deviceId;
                            const label = mediaDevice.label || `Audio ${audCount++}`;
                            const textNode = document.createTextNode(label);
                            option.appendChild(textNode);
                            $('#aud').append(option);
                        }
                    });
                })
                .catch(function (err) {
                    console.log(err.name + ': ' + err.message);
                });
            $('#cam-select').show();
            $('#aud-select').show();
        }
    } catch (error) {
        console.log(error);
    } finally {
        document.body.style.display = '';
    }
});


async function connectMicrobit() {
    if(!uBitDevice) return;
    const server = await uBitDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    const txCharacteristic = await service.getCharacteristic(
      UART_TX_CHARACTERISTIC_UUID
    );
    console.log("Starting notifications");
    txCharacteristic.startNotifications();
    txCharacteristic.addEventListener(
      "characteristicvaluechanged",
      onTxCharacteristicValueChanged
    );
    rxCharacteristic = await service.getCharacteristic(
      UART_RX_CHARACTERISTIC_UUID
    );
}

function onTxCharacteristicValueChanged(event) {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const text = decoder.decode(value);
    console.log(text);
    addLog(text);
}

function microbitDisconnect() {
    console.log('Device disconnected');
    addLog('Microbit Disconnected');
    $('#openPort').hide();
    open = false;
    openPort();
}


async function openPort() {
    if (!open) {
        await connectMicrobit();
        open = true;
        $('#openPort').show();
        addLog('Microbit Connected');
    } else {
        console.log('Port already open...');
    }
}

async function closePort(reopen = -1) {
    if(!uBitDevice) return;
    if(uBitDevice.connected) {
        await uBitDevice.gatt.disconnect();
    }
    $('#openPort').hide();
    open = false;
    if (reopen === 1) await openPort();
}

async function writeToSerial(value) {
    if(!uBitDevice) return;
    if(!uBitDevice.gatt.connected) return;
    value=value+"\n";
    let dv = new DataView(new ArrayBuffer(value.length))
    let i = 0
    for(let c of value) {
        dv.setUint8(i++, c.charCodeAt(0))
    }
    await rxCharacteristic.writeValue(dv);
}

