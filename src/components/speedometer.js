import React, { useState, useEffect } from 'react';

function Speedometer() {
  const [speed, setSpeed] = useState(0);
  const [units, setUnits] = useState('km/h');
  const [error, setError] = useState(null); // To store error messages
  let lastTimestamp = null;
  let velocity = 0;
  let accelerationValues = [];
  let timeValues = [];

  const handleDeviceMotion = (event) => {
    if (event.accelerationIncludingGravity) {
      const { accelerationIncludingGravity } = event;
      const timestamp = event.timeStamp;

      accelerationValues.push(accelerationIncludingGravity.x);
      timeValues.push(timestamp);

      if (accelerationValues.length >= 3 && timeValues.length >= 3) {
        const distance = integrateSimpson(accelerationValues, timeValues);
        const timeDiff = (timeValues[timeValues.length - 1] - timeValues[0]) / 1000;
        const speedMetersPerSecond = Math.abs(distance / timeDiff);
        const speedKPH = speedMetersPerSecond * 3.6;
        const speedMPH = speedKPH / 1.609344;
        setSpeed(units === 'km/h' ? speedKPH : speedMPH);

        accelerationValues = [];
        timeValues = [];
      }
    }
  };

  const filterRef = useRef(null);

  useEffect(() => {
    // Kalman Filter setup
    const k = 0.5; // Kalman gain (adjust for better performance)
    filterRef.current = new KalmanFilter({
      R: 5,       // Measurement noise (adjust)
      Q: 1,       // Process noise (adjust)
      A: [[1, 1], [0, 1]],   // State transition matrix (constant velocity model)
      B: [[0.5], [1]],       // Control input matrix (acceleration as input)
      C: [[1, 0]],           // Measurement matrix (only observe position)
    });
    filterRef.current.filter([[0], [0]]); // Initial state: position = 0, velocity = 0

    const handleAccelerometerData = (accelerometerData) => {
      const { x: acceleration } = accelerometerData;

      // Apply Kalman Filter
      const predictedState = filterRef.current.predict([[acceleration]]);
      const filteredState = filterRef.current.filter([[0], [acceleration]]); // No measurement for now

      // Extract speed from filtered state
      const [filteredPosition, filteredVelocity] = filteredState;
      const filteredSpeedMetersPerSecond = filteredVelocity[0]; // Velocity is our speed estimate

      // Convert speed back to km/h or MPH
      const speedKPH = filteredSpeedMetersPerSecond * 3.6;
      const speedMPH = speedKPH / 1.609344;
      setSpeed(units === 'km/h' ? speedKPH : speedMPH);
    };

    // Subscribe to accelerometer updates
    const _subscribe = Accelerometer.addListener(handleAccelerometerData);
    Accelerometer.setUpdateInterval(16); // Around 60Hz update rate

    return () => {
      _subscribe && _subscribe.remove(); // Cleanup on unmount
    };
  }, [units]); // Re-run effect if units change
  // Simpson's Rule integration function
  function integrateSimpson(accValues, timeValues) {
    if (accValues.length !== timeValues.length || accValues.length < 3) {
      throw new Error("Invalid input for Simpson's rule integration");
    }

    let totalDistance = 0;
    for (let i = 1; i < accValues.length; i += 2) {
      const h = timeValues[i] - timeValues[i - 1];
      totalDistance += (h / 3) * (accValues[i - 1] + 4 * accValues[i] + accValues[i + 1]);
    }
    return totalDistance;
  }

  // Haversine formula to calculate distance
  function haversineDistance(coords1, coords2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (coords1.latitude * Math.PI) / 180;
    const φ2 = (coords2.latitude * Math.PI) / 180;
    const Δφ = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
    const Δλ = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
  }

  return (
    <div>
      {error ? (
        <p style={{ color: 'red' }}>{error}</p> 
      ) : (
        <>
          <button onClick={() => setUnits(units === 'km/h' ? 'MPH' : 'km/h')}>
            {units}
          </button>
          <h1>{speed.toFixed(1)} {units}</h1>
        </>
      )}
    </div>
  );
}

export default Speedometer;
