declare type webext$alarms$alarms = {|
  onAlarm: webext$alarms$onAlarm,
  create: typeof webext$alarms$create,
  get: typeof webext$alarms$get,
  getAll: typeof webext$alarms$getAll,
  clear: typeof webext$alarms$clear,
  clearAll: typeof webext$alarms$clearAll
|};
