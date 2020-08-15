// ��������� ������ �� �������� UI
let connectButton = document.getElementById('connect');
let connect2Button = document.getElementById('connect2');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');

// ����������� � ���������� ��� ������� �� ������ Connect
connectButton.addEventListener('click', function() {
  connect();
});
connect2Button.addEventListener('click', function() {
  connect_cc2541();
});

// ���������� �� ���������� ��� ������� �� ������ Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// ��������� ������� �������� �����
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // ������������� �������� �����
  send(inputField.value); // ��������� ���������� ���������� ����
  inputField.value = '';  // �������� ��������� ����
  inputField.focus();     // ������� ����� �� ��������� ����
});

// ��� ������� ���������� ����������
let deviceCache = null;

// ��������� ����� Bluetooth ���������� � ������������ � ����������
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
function connect_cc2541() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice_cc2541()).
      then(device => connectDeviceAndCacheCharacteristic_cc2541(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// ����������� � ������������� ����������, ��������� ������� � ��������������
let characteristicCache = null;
let characteristicWrCache = null;

// ����������� � ������������� ����������, ��������� ������� � ��������������
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');
  device.gatt.connect().
	then(server => {
	log('GATT server connected, getting service...');
	return server.getPrimaryService(0xFFE0);
	}).
	then(service => {
	log('Service found, getting characteristic...');
	return service.getCharacteristic(0xFFE2);
	}).
	then(characteristic => {
	log('Characteristic write found');
	characteristicWrCache = characteristic;
	return characteristicWrCache;
	  });

  return device.gatt.connect().
      then(server => {
        return server.getPrimaryService(0xFFE0);
      }).
      then(service => {
        return service.getCharacteristic(0xFFE1);
      }).
      then(characteristic => {
        log('Characteristic notification found');
        characteristicCache = characteristic;
        return characteristicCache;
      });
}
function connectDeviceAndCacheCharacteristic_cc2541(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');

        return server.getPrimaryService(0xFFF0);
      }).
      then(service => {
        log('Service found, getting characteristic...');

        return service.getCharacteristic(0xFFF4);
      }).
      then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
      });
}
// ����� � ��������
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// ������ ������ Bluetooth ����������
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFE0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // ����������� ������
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}
function requestBluetoothDevice_cc2541() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFF0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // ����������� ������
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// ���������� ������������
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
// ��������� ��������� ����������� �� ��������� ��������������
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        // ����������� ������
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}

// ����������� �� ������������� ����������
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  // ����������� �������
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}

// ������������� ����� ��� �������� ������
let readBuffer = '';

// ��������� ������
function handleCharacteristicValueChanged(event) {
  let value = event.target.value;
  let a = [];
  let perc = [];
  // Convert raw data bytes to hex values just for the sake of showing something.
  // In the "real" world, you'd use data.getUint8, data.getUint16 or even
  // TextDecoder to process raw data bytes.
  for (let i = 0; i < value.byteLength; i++) {
    a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
  }
  receive(a);
  perc.push('Percent: ' + ('00' + value.getUint8(7).toString(10)).slice(-2) + '%'); 
  receive(perc);
}

// ��������� ���������� ������
function receive(data) {
  log(data, 'in');
}

// ��������� ������ ������������� ����������
function send(data) {
  data = String(data);

  if (!data || !characteristicWrCache) {
    return;
  }

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicWrCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicWrCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicWrCache,data);
  }
  
  log(data, 'out');
}
// �������� �������� � ��������������
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new Uint8Array([58,7,1,4,0,-56,0,29]));
}