declare function webext$alarms$get(callback?: (alarm: webext$alarms$Alarm) => void): Promise<webext$alarms$Alarm>;
declare function webext$alarms$get(name: string, callback?: (alarm: webext$alarms$Alarm) => void): Promise<webext$alarms$Alarm>;
