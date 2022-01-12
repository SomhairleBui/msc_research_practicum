import React, { useState } from "react";
import DateTimePicker from "react-datetime-picker";
import "./TimePicker.css";

export default function TimePicker({ update, predictNow }) {
  const [value, b] = useState(new Date());
  const nextweek = new Date();
  nextweek.setDate(nextweek.getDate() + 7);

  return (
    <div>
      <DateTimePicker
        onChange={(pickerDate) => {
          b(pickerDate);
          update(pickerDate);
        }}
        minDate={new Date()}
        maxDate = {nextweek}
        value={value}
        disabled={predictNow}
      />
    </div>
  );
}
