# homebridge-dimmer-accessory

Light status and dimmable via MQTT in Homebridge


Installation
--------------------
    sudo npm install -g homebridge-dimmer-accessory


Sample HomeBridge Configuration
--------------------
    {
      "bridge": {
        "name": "HomeBridge",
        "username": "CC:12:3B:D3:CE:11",
        "port": 51826,
        "pin": "321-45-223"
      },
      "description": "",
      "accessories": [
        {
          "accessory": "dimmer-accessory-brightness",
          "name": "Room Dimmer",
          "url": "mqtt://localhost",
          "topics": {
            "statusGet": "getBulbStatus",
            "statusSet": "setBulbStatus"
          },
          "username": "username",
          "password": "password"
        }
      ],
      "platforms": []
    }
