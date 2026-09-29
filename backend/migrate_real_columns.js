const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect('mongodb://127.0.0.1:27017/terrawave');
  const db = mongoose.connection.db;

  const result = await db.collection('sensorreadings').updateMany(
    { source: 'esp32' },
    [
      {
        $set: {
          realData: true,
          isRealHardware: true,
          dataType: 'REAL_HARDWARE',
          sensorPin: 'GPIO_1',
          realMoisture: '$soilMoisture'
        }
      }
    ]
  );

  console.log('Migrated sensorreadings count:', result.modifiedCount);

  // Also update irrigation_training_data
  const trainResult = await db.collection('irrigation_training_data').updateMany(
    { source: { $ne: 'DEMO DATA' } },
    [
      {
        $set: {
          realData: true,
          isRealHardware: true,
          dataType: 'REAL_HARDWARE',
          hardwareSource: 'ESP32-S3_GPIO1',
          realSoilMoisture: '$initialMoisture'
        }
      }
    ]
  );
  console.log('Migrated training records count:', trainResult.modifiedCount);

  await mongoose.disconnect();
}

migrate().catch(console.error);
