module.exports = function(RED) {

   //写入json文件
   function writeJson(path,jsonContent) {
    const fs = require('fs');
    fs.writeFile(path, jsonContent, (err) => {
        if (err) {
                // 错误
                node.error('文件写入失败', err);
                return;
        }
    });
   }

    //上次时间
    var  lastTriggerTime = null;
    // 计算时间间隔的函数
    function calculateTimeInterval(currentTime) {
        if (lastTriggerTime  == null) {
            lastTriggerTime = currentTime;
            return -1; // 如果是第一次触发，则返回空
        } else {
            var timeInterval = (currentTime - lastTriggerTime) / 1000;
            lastTriggerTime = currentTime;
            return timeInterval; // 返回时间间隔
        }
    }

    function ElectricEnergy(config) {
        RED.nodes.createNode(this,config);
        this.path = config.path;
        this.timeout = config.timeout;
        this.sendmode = config.sendmode;
        var node = this;
        var saveValue = 0;
        var defaultDate = {
            electricity: 0
        }

        const fs = require('fs');
            // 读取文件
            fs.readFile(this.path, 'utf8', (err, data) => {
                if (err) {
                if (err.code === 'ENOENT') { // 如果文件不存在,则新建一个文件
                    // 默认电能消耗历史值为0
                    saveValue = 0;
                    writeJson(this.path, JSON.stringify(defaultDate))
                    node.error("文件读取失败，新建一个文件");
                return;
                }
                node.error('读取文件时发生错误:', err);
                return;
                }

                try {
                       //解析JSON数据
                    this.jsonData = JSON.parse(data);
                    if (this.jsonData.electricity != undefined) {
                        saveValue = this.jsonData.electricity;
                    }
                } catch (errdata) {
                    writeJson(this.path, JSON.stringify(defaultDate))
                    node.error("读取文件JSON解析失败,新建一个文件", errdata);
                }
            });

        node.on('input', function(msg) {
            //输入的电流和电压
            let current = msg.current;
            let voltage = msg.voltage;
      
            var timeInterval = calculateTimeInterval(Date.now())

            if(this.timeout > 0 && timeInterval > 0 && timeInterval  < this.timeout){
                
                //计算规则：当前电压x当前电流x采集间隔/1000/3600;将瓦每秒转换成千瓦时
                let energy =  parseFloat(((current * voltage * timeInterval)/1000/3600 + saveValue).toFixed(8))
                msg.payload = energy
                if ((this.sendmode == "1" &&  current > 0 && voltage > 0) || (this.sendmode == "0" &&  !(current < 0) && !(voltage < 0))) {
                    defaultDate.electricity = energy;
                    const jsonSendData = JSON.stringify(defaultDate);
                // 将值写入文件
                writeJson(this.path,jsonSendData)
                saveValue = energy;
                node.send(msg);
                }        
            }
        });
    }
    RED.nodes.registerType("electricity",ElectricEnergy);
}