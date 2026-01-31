import { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function MonthPickerHeader({ date, onChange }) {
  const [show, setShow] = useState(false);

  const openPicker = () => setShow(true);

  const onDateChange = (event, selectedDate) => {
    setShow(false);
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const monthYear = date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <View style={{ padding: 12, backgroundColor: "#2E7D32" }}>
      <TouchableOpacity onPress={openPicker}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
          {monthYear} ▼
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          onChange={onDateChange}
        />
      )}
    </View>
  );
}
