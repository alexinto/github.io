// Ïîëó÷åíèå ññûëîê íà ýëåìåíòû UI
let connectButton = document.getElementById('connect');
let connect2Button = document.getElementById('connect2');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');

// Ïîäêëþ÷åíèå ê óñòðîéñòâó ïðè íàæàòèè íà êíîïêó Connect
connectButton.addEventListener('click', function() {
  connect();
});
connect2Button.addEventListener('click', function() {
  connect_cc2541();
});

// Îòêëþ÷åíèå îò óñòðîéñòâà ïðè íàæàòèè íà êíîïêó Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// Îáðàáîòêà ñîáûòèÿ îòïðàâêè ôîðìû
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Ïðåäîòâðàòèòü îòïðàâêó ôîðìû
  send(inputField.value); // Îòïðàâèòü ñîäåðæèìîå òåêñòîâîãî ïîëÿ
  inputField.value = '';  // Îáíóëèòü òåêñòîâîå ïîëå
  inputField.focus();     // Âåðíóòü ôîêóñ íà òåêñòîâîå ïîëå
});

// Êýø îáúåêòà âûáðàííîãî óñòðîéñòâà
let deviceCache = null;

// Çàïóñòèòü âûáîð Bluetooth óñòðîéñòâà è ïîäêëþ÷èòüñÿ ê âûáðàííîìó
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

// Ïîäêëþ÷åíèå ê îïðåäåëåííîìó óñòðîéñòâó, ïîëó÷åíèå ñåðâèñà è õàðàêòåðèñòèêè
let characteristicCache = null;
let characteristicWrCache = null;

// Ïîäêëþ÷åíèå ê îïðåäåëåííîìó óñòðîéñòâó, ïîëó÷åíèå ñåðâèñà è õàðàêòåðèñòèêè
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
// Âûâîä â òåðìèíàë
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Çàïðîñ âûáîðà Bluetooth óñòðîéñòâà
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFE0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // Äîáàâëåííàÿ ñòðîêà
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

        // Äîáàâëåííàÿ ñòðîêà
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// Îáðàáîò÷èê ðàçúåäèíåíèÿ
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
// Âêëþ÷åíèå ïîëó÷åíèÿ óâåäîìëåíèé îá èçìåíåíèè õàðàêòåðèñòèêè
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        // Äîáàâëåííàÿ ñòðîêà
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}

// Îòêëþ÷èòüñÿ îò ïîäêëþ÷åííîãî óñòðîéñòâà
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

  // Äîáàâëåííîå óñëîâèå
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}

// Ïðîìåæóòî÷íûé áóôåð äëÿ âõîäÿùèõ äàííûõ
let readBuffer = '';

// Ïîëó÷åíèå äàííûõ
function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value);

  for (let c of value) {
    if (c === '\n') {
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

// Îáðàáîòêà ïîëó÷åííûõ äàííûõ
function receive(data) {
  log(data, 'in');
}

// Îòïðàâèòü äàííûå ïîäêëþ÷åííîìó óñòðîéñòâó
function send(data) {
  data = String(data);
	
  if (!data || !characteristicWrCache) {
    return;
  }

  data += '\n';

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
    writeToCharacteristic(characteristicWrCache, data);
  }

  log(data, 'out');
}
// Çàïèñàòü çíà÷åíèå â õàðàêòåðèñòèêó
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}