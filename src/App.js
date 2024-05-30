import React, { useState } from 'react';
import Speedometer from './Speedometer';


function Speedometer() {
  const [speed, setSpeed] = useState(0);

  return <h1>{speed}</h1>;
}

export default Speedometer;
