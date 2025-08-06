require('dotenv').config();
const TaskScheduler = require('./utils/TaskScheduler');

(async () => {
  const scheduler = new TaskScheduler();
  await scheduler.ejecutarBackupManual('completo');
})();
