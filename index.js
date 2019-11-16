// MQTT
'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");

function mqttdimmerAccessory(log, config) {
  this.log        = log;
  this.name       = config["name"];
  this.url        = config["url"];
  this.sn         = config['sn'] || 'Unknown';
  this.model      = config['model'] || 'Dimmer';
  this.client_Id  = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.options = {
    keepalive: 10,
    clientId: this.client_Id,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
      topic: 'WillMsg',
      payload: 'Connection Closed abnormally..!',
      qos: 0,
      retain: false
    },
    username: config["username"],
    password: config["password"],
    rejectUnauthorized: false
  };

  this.caption = config["caption"];
  this.topics = config["topics"];

  this.service = new Service.Lightbulb(this.name);

  this.service.getCharacteristic(Characteristic.On)
    .on('get', this.getOn.bind(this))
    .on('set', this.setOn.bind(this));

  this.service.addCharacteristic(Characteristic.Brightness)
    .on('get', this.getBrightness.bind(this))
    .on('set', this.setBrightness.bind(this));

  this.service.addCharacteristic(Characteristic.Saturation)
    .on('get', this.getSaturation.bind(this))
    .on('set', this.setSaturation.bind(this));

  this.service.addCharacteristic(Characteristic.Hue)
    .on('get', this.getHue.bind(this))
    .on('set', this.setHue.bind(this));

  this.service.addCharacteristic(Characteristic.ColorTemperature)
    .on('get', this.getColorTemperature.bind(this))
    .on('set', this.setColorTemperature.bind(this))
    .setProps({
      minValue: 150,
      maxValue: 450
    });

  // connect to MQTT broker
  this.client = mqtt.connect(this.url, this.options);
  var self = this;

  this.on = true;
  this.brightness = 50;
  this.hue = 0;
  this.saturation = 100;
  this.temperature = 150;

  this.client.on('error', function(err) {
    that.log('Error event on MQTT:', err);
  });
}

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-dimmer-accessory", "dimmer-accessory-brightness", mqttdimmerAccessory);
}

function hsv2rgb(h, s, v) {
  var r, g, b, i, f, p, q, t;

  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

mqttdimmerAccessory.prototype.encodeChecksum = function(stringComma) {
  var byteArray = stringComma.split(',');
  var checksum = 1;

  stringComma = "";
  for (var i = 0; i < byteArray.length; ++i) {
    var value = parseInt(byteArray[i], 10);
    stringComma += value + ',';
    checksum += value;
  }
  checksum = 256 - (checksum % 256);
  stringComma += checksum;

  this.log("EncodeChecksum : [%s]", stringComma);
  return stringComma;
};

mqttdimmerAccessory.prototype.getOn = function(callback) {
  callback(null, this.on);
};

mqttdimmerAccessory.prototype.getBrightness = function(callback) {
  callback(null, this.brightness);
};

mqttdimmerAccessory.prototype.getSaturation = function(callback) {
  callback(null, this.saturation);
};

mqttdimmerAccessory.prototype.getHue = function(callback) {
  callback(null, this.hue);
};

mqttdimmerAccessory.prototype.getColorTemperature = function(callback) {
  callback(null, this.temperature);
};

mqttdimmerAccessory.prototype.setOn = function(status, callback, context) {
  if (this.on != status && context !== 'fromSetValue') {
    this.on = status;

    var protocol = status ? this.topics.switchOn : this.topics.switchOff;
    this.client.publish(this.topics.send, this.encodeChecksum(protocol));
  }
  callback();
};

mqttdimmerAccessory.prototype.setBrightness = function(brightness, callback, context) {
  if (this.brightness != brightness && context !== 'fromSetValue') {
    this.brightness = brightness;

    var value = this.brightness * 255 / 100;
    var protocol = this.topics.brightness;
    protocol = protocol.replace('X', value.toString());
    this.client.publish(this.topics.send, this.encodeChecksum(protocol));
  }
  callback();
};

mqttdimmerAccessory.prototype.setSaturation = function(saturation, callback, context) {
  if (this.saturation != saturation && context !== 'fromSetValue') {
    this.saturation = saturation;

    var value = hsv2rgb(this.hue / 360, this.saturation / 100, this.brightness / 100);
    var protocol = this.topics.rgb;
    protocol = protocol.replace('R', value[0]);
    protocol = protocol.replace('G', value[1]);
    protocol = protocol.replace('B', value[2]);
    this.client.publish(this.topics.send, this.encodeChecksum(protocol));
  }
  callback();
};

mqttdimmerAccessory.prototype.setHue = function(hue, callback, context) {
  if (this.hue != hue && context !== 'fromSetValue') {
    this.hue = hue;

    var value = hsv2rgb(this.hue / 360, this.saturation / 100, this.brightness / 100);
    var protocol = this.topics.rgb;
    protocol = protocol.replace('R', value[0]);
    protocol = protocol.replace('G', value[1]);
    protocol = protocol.replace('B', value[2]);
    this.client.publish(this.topics.send, this.encodeChecksum(protocol));
  }
  callback();
};

mqttdimmerAccessory.prototype.setColorTemperature = function(temperature, callback, context) {
  if (this.temperature != temperature && context !== 'fromSetValue') {
    this.temperature = temperature;

    var value = 255 - Math.min(Math.max((1000000 / temperature - 2200) / (6600 - 2200) * 255, 0), 255);
    var protocol = this.topics.temperature;
    protocol = protocol.replace('X', value.toString());
    this.client.publish(this.topics.send, this.encodeChecksum(protocol));
  }
  callback();
};

mqttdimmerAccessory.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();

  informationService.setCharacteristic(Characteristic.Name, this.name)
                    .setCharacteristic(Characteristic.Manufacturer, "iLink")
                    .setCharacteristic(Characteristic.Model, this.model)
                    .setCharacteristic(Characteristic.SerialNumber, this.sn);

  return [informationService,this.service];
}
