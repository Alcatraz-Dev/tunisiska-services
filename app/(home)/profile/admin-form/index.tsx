import React, { useState, useEffect } from "react";
import { View, SafeAreaView, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, Switch, Text, Modal, Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { client } from "@/sanityClient";
import { useTheme } from "@/app/context/ThemeContext";

const getDocType = (t: string) => {
  switch (t) {
    case "shipping-orders": return "shippingOrder";
    case "taxi-orders": return "taxiOrder";
    case "move-orders": return "moveOrder";
    case "container-shipping-orders": return "containerShippingOrder";
    case "shipping-schedules": return "shippingSchedule";
    case "container-shipping-schedules": return "containerShippingSchedule";
    case "move-clean-orders": return "moveCleaningOrder";
    case "live-status": return "liveStatus";
    case "footer": return "footer";
    case "terms": return "terms";
    case "privacy": return "policy";
    case "users": return "users";
    case "announcements": return "announcement";
    case "friend-requests": return "friendRequest";
    case "notification-history": return "notificationHistory";
    default: return t;
  }
};

type FieldType = "text" | "number" | "boolean" | "select" | "datetime" | "array" | "object" | "reference" | "footer-links" | "social-media";

interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  objectFields?: FieldDef[];
  arrayItems?: string[];
  readOnly?: boolean;
}

// Field definitions matching Sanity schemas exactly
const fieldDefinitions: Record<string, FieldDef[]> = {
  users: [
    { name: "clerkId", label: "Clerk ID", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "points", label: "Points", type: "number" },
    { name: "isDriver", label: "Is Driver", type: "boolean" },
    { name: "isAdmin", label: "Is Admin", type: "boolean" },
  ],
  announcements: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "message", label: "Message", type: "text" },
    { name: "date", label: "Date", type: "datetime" },
  ],
  "shipping-orders": [
    { name: "userId", label: "User ID", type: "text" },
    { name: "customerInfo", label: "Customer Information", type: "object" },
    { name: "pickupAddress", label: "Pickup Address", type: "text", required: true },
    { name: "deliveryAddress", label: "Delivery Address", type: "text", required: true },
    { name: "route", label: "Route", type: "text" },
    { name: "scheduledDateTime", label: "Scheduled Date & Time", type: "datetime", required: true },
    { name: "packageDetails", label: "Package Details", type: "object" },
    { name: "shippingSpeed", label: "Shipping Speed", type: "select", options: ["standard", "express", "overnight"] },
    { name: "requiresSignature", label: "Requires Signature", type: "boolean" },
    { name: "insuranceValue", label: "Insurance Value (SEK)", type: "number" },
    { name: "trackingNumber", label: "Tracking Number", type: "text", readOnly: true },
    { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "in_progress", "completed", "cancelled"] },
    { name: "totalPrice", label: "Total Price (SEK)", type: "number" },
    { name: "pointsUsed", label: "Points Used", type: "number" },
    { name: "paymentMethod", label: "Payment Method", type: "select", options: ["stripe", "points", "combined", "cash"] },
    { name: "notes", label: "Special Notes/Instructions", type: "text" },
    { name: "createdAt", label: "Created At", type: "datetime", readOnly: true },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  "taxi-orders": [
    { name: "userId", label: "User ID", type: "text" },
    { name: "customerInfo", label: "Customer Information", type: "object" },
    { name: "pickupAddress", label: "Pickup Address", type: "text", required: true },
    { name: "destinationAddress", label: "Destination Address", type: "text", required: true },
    { name: "scheduledDateTime", label: "Scheduled Date & Time", type: "datetime", required: true },
    { name: "numberOfPassengers", label: "Number of Passengers", type: "number", min: 1, max: 4 },
    { name: "isRoundTrip", label: "Round Trip", type: "boolean" },
    { name: "returnDateTime", label: "Return Date & Time", type: "datetime" },
    { name: "estimatedDistance", label: "Estimated Distance (km)", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "in_progress", "completed", "cancelled"] },
    { name: "totalPrice", label: "Total Price (SEK)", type: "number" },
    { name: "pointsUsed", label: "Points Used", type: "number" },
    { name: "paymentMethod", label: "Payment Method", type: "select", options: ["stripe", "points", "combined", "cash"] },
    { name: "notes", label: "Special Notes/Instructions", type: "text" },
    { name: "createdAt", label: "Created At", type: "datetime", readOnly: true },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  "move-orders": [
    { name: "userId", label: "User ID", type: "text" },
    { name: "customerInfo", label: "Customer Information", type: "object" },
    { name: "pickupAddress", label: "Pickup Address", type: "text", required: true },
    { name: "deliveryAddress", label: "Delivery Address", type: "text", required: true },
    { name: "scheduledDateTime", label: "Scheduled Date & Time", type: "datetime", required: true },
    { name: "numberOfItems", label: "Number of Items", type: "number", min: 1 },
    { name: "numberOfPersons", label: "Number of Persons", type: "number", min: 1 },
    { name: "hasElevator", label: "Has Elevator", type: "boolean" },
    { name: "itemCategories", label: "Item Categories", type: "array", arrayItems: ["furniture", "electronics", "boxes", "clothing", "fragile", "heavy_items", "appliances"] },
    { name: "estimatedHours", label: "Estimated Hours", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "in_progress", "completed", "cancelled"] },
    { name: "totalPrice", label: "Total Price (SEK)", type: "number" },
    { name: "pointsUsed", label: "Points Used", type: "number" },
    { name: "paymentMethod", label: "Payment Method", type: "select", options: ["stripe", "points", "combined", "cash"] },
    { name: "notes", label: "Special Notes/Instructions", type: "text" },
    { name: "specialRequirements", label: "Special Requirements", type: "text" },
    { name: "createdAt", label: "Created At", type: "datetime", readOnly: true },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  "container-shipping-orders": [
    { name: "userId", label: "User ID", type: "text" },
    { name: "customerInfo", label: "Customer Information", type: "object" },
    { name: "pickupAddress", label: "Pickup Address", type: "text", required: true },
    { name: "deliveryAddress", label: "Delivery Address", type: "text", required: true },
    { name: "route", label: "Route", type: "text" },
    { name: "scheduledDateTime", label: "Scheduled Date & Time", type: "datetime", required: true },
    { name: "packageDetails", label: "Container Details", type: "object" },
    { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "in_progress", "completed", "cancelled"] },
    { name: "totalPrice", label: "Total Price (SEK)", type: "number" },
    { name: "pointsUsed", label: "Points Used", type: "number" },
    { name: "paymentMethod", label: "Payment Method", type: "select", options: ["stripe", "points", "combined", "cash"] },
    { name: "notes", label: "Special Notes/Instructions", type: "text" },
    { name: "createdAt", label: "Created At", type: "datetime", readOnly: true },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  "shipping-schedules": [
    { name: "route", label: "Route", type: "select", options: ["stockholm_tunis", "tunis_stockholm", "tunis_sousse", "tunis_sfax"], required: true },
    { name: "isActive", label: "Active Route", type: "boolean" },
    { name: "departureTime", label: "Departure Time", type: "datetime", required: true },
    { name: "capacity", label: "Capacity (kg)", type: "number", min: 1 },
    { name: "availableCapacity", label: "Available Capacity (kg)", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["available", "full", "departed", "cancelled"] },
    { name: "vehicle", label: "Vehicle", type: "select", options: ["cargo_van", "truck", "container_ship", "air_freight"] },
    { name: "notes", label: "Notes", type: "text" },
    { name: "assignedDriver", label: "Assigned Driver", type: "reference" },
  ],
  "container-shipping-schedules": [
    { name: "route", label: "Route", type: "select", options: ["stockholm_tunis", "tunis_stockholm", "tunis_sousse", "tunis_sfax"], required: true },
    { name: "isActive", label: "Active Route", type: "boolean" },
    { name: "departureTime", label: "Departure Time", type: "datetime", required: true },
    { name: "capacity", label: "Capacity (Number of containers)", type: "number", min: 1 },
    { name: "availableCapacity", label: "Available Capacity", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["available", "full", "departed", "cancelled"] },
    { name: "vehicle", label: "Vehicle", type: "select", options: ["container_ship"] },
    { name: "notes", label: "Notes", type: "text" },
  ],
  "move-clean-orders": [
    { name: "userId", label: "User ID", type: "text" },
    { name: "customerInfo", label: "Customer Information", type: "object" },
    { name: "pickupAddress", label: "Pickup Address", type: "text", required: true },
    { name: "deliveryAddress", label: "Delivery Address", type: "text", required: true },
    { name: "scheduledDateTime", label: "Scheduled Date & Time", type: "datetime", required: true },
    { name: "numberOfItems", label: "Number of Items", type: "number", min: 1 },
    { name: "numberOfPersons", label: "Number of Persons", type: "number", min: 1 },
    { name: "hasElevator", label: "Has Elevator", type: "boolean" },
    { name: "itemCategories", label: "Item Categories", type: "array", arrayItems: ["furniture", "electronics", "boxes", "clothing", "fragile", "heavy_items", "appliances"] },
    { name: "cleaningAreas", label: "Cleaning Areas", type: "array", arrayItems: ["kitchen", "bathroom", "living_room", "bedroom", "hallway", "windows", "floors", "entire_apartment"] },
    { name: "cleaningIntensity", label: "Cleaning Intensity", type: "select", options: ["basic", "deep", "move_out"] },
    { name: "cleaningSupplies", label: "Cleaning Supplies Provided", type: "boolean" },
    { name: "estimatedHours", label: "Estimated Hours", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "in_progress", "completed", "cancelled"] },
    { name: "totalPrice", label: "Total Price (SEK)", type: "number" },
    { name: "pointsUsed", label: "Points Used", type: "number" },
    { name: "paymentMethod", label: "Payment Method", type: "select", options: ["stripe", "points", "combined", "cash"] },
    { name: "notes", label: "Special Notes/Instructions", type: "text" },
    { name: "specialRequirements", label: "Special Requirements", type: "text" },
    { name: "createdAt", label: "Created At", type: "datetime", readOnly: true },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  "live-status": [
    { name: "title", label: "Title", type: "text" },
    { name: "statuses", label: "Status Messages", type: "array", arrayItems: [] },
    { name: "isActive", label: "Is Active?", type: "boolean" },
  ],
  "friend-requests": [
    { name: "fromUserId", label: "From User ID", type: "text" },
    { name: "fromUserName", label: "From User Name", type: "text" },
    { name: "fromUserImageUrl", label: "From User Image URL", type: "text" },
    { name: "fromUserPoints", label: "From User Points", type: "number" },
    { name: "toUserId", label: "To User ID", type: "text" },
    { name: "pointsToTransfer", label: "Points to Transfer", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["pending", "accepted", "rejected"] },
    { name: "createdAt", label: "Created At", type: "datetime" },
    { name: "updatedAt", label: "Updated At", type: "datetime" },
  ],
  footer: [
    { name: "copyright", label: "Copyright Text", type: "text" },
    { name: "links", label: "Footer Links", type: "footer-links" },
    { name: "socialMedia", label: "Social Media Links", type: "social-media" },
  ],
  terms: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "content", label: "Content", type: "text" },
    { name: "lastUpdated", label: "Last Updated", type: "datetime", required: true },
  ],
  privacy: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "content", label: "Content", type: "text" },
    { name: "lastUpdated", label: "Last Updated", type: "datetime", required: true },
  ],
  "notification-history": [
    { name: "title", label: "Title", type: "text" },
    { name: "message", label: "Message", type: "text" },
    { name: "dateSent", label: "Date Sent", type: "datetime" },
    { name: "notificationType", label: "Type", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["sent", "read", "deleted"] },
    { name: "nativeNotifyId", label: "NativeNotify ID", type: "text" },
  ],
};

const ROUTE_LABELS: Record<string, string> = {
  stockholm_tunis: "Stockholm → Tunis",
  tunis_stockholm: "Tunis → Stockholm",
  tunis_sousse: "Tunis → Sousse",
  tunis_sfax: "Tunis → Sfax",
  cargo_van: "Cargo Van",
  truck: "Truck",
  container_ship: "Container Ship",
  air_freight: "Air Freight",
};

function formatDateTime(val: any): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    return d.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(val);
  }
}

export default function AdminAddScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();

  const type = String(params.type || "none");
  const id = String(params.id || "none");
  const isNew = id === "new";

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const fields = fieldDefinitions[type] || [];

  useEffect(() => {
    if (!isNew && id && type && id !== "none") {
      const docType = getDocType(type);
      client.fetch(`*[_type == $docType && _id == $id][0]`, { docType, id }).then(result => {
        if (result) {
          setFormData(result);
        }
      }).catch(e => console.error(e));
    } else {
      setFormData({});
    }
  }, [id, type]);

  const updateField = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDatePress = (fieldName: string) => {
    const currentVal = formData[fieldName];
    setPickerDate(currentVal ? new Date(currentVal) : new Date());
    setPickerField(fieldName);
    setShowPicker(true);
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      setPickerDate(selectedDate);
      if (pickerField) {
        updateField(pickerField, selectedDate.toISOString());
      }
    }
  };

  const handleDateDone = () => {
    setShowPicker(false);
    if (pickerField) {
      updateField(pickerField, pickerDate.toISOString());
    }
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      Alert.alert("Error", "No fields defined for this type");
      return;
    }

    setSaving(true);
    try {
      const docType = getDocType(type);
      const dataToSave: Record<string, any> = {};

      for (const field of fields) {
        if (field.readOnly) continue;
        const val = formData[field.name];
        if (val !== undefined) {
          dataToSave[field.name] = val;
        }
      }

      if (isNew) {
        const result = await client.create({ _type: docType, ...dataToSave });
        console.log(`[AdminForm] Created doc:`, result);
      } else {
        await client.patch(id).set(dataToSave).commit();
      }
      Alert.alert("Success", isNew ? "Created successfully" : "Updated successfully");
      router.back();
    } catch (error: any) {
      console.error(`[AdminForm] Save error:`, error);
      Alert.alert("Error", error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FieldDef) => {
    const value = formData[field.name];

    if (field.type === "boolean") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6" }}>
          <Text style={{ color: isDark ? "#fff" : "#000", flex: 1 }}>{field.label}</Text>
          <Switch
            value={value || false}
            onValueChange={v => updateField(field.name, v)}
            trackColor={{ false: "#767577", true: "#3b82f6" }}
          />
        </View>
      );
    }

    if (field.type === "select") {
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(field.options || []).map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => updateField(field.name, opt)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: value === opt ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6"),
                  borderWidth: 1,
                  borderColor: value === opt ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: value === opt ? "#fff" : (isDark ? "#ccc" : "#333") }}>
                  {ROUTE_LABELS[opt] || opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (field.type === "datetime") {
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <TouchableOpacity
            onPress={() => !field.readOnly && handleDatePress(field.name)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderRadius: 16,
              backgroundColor: field.readOnly ? (isDark ? "rgba(255,255,255,0.02)" : "#f9f9f9") : (isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"),
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
              opacity: field.readOnly ? 0.6 : 1,
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={isDark ? "#888" : "#666"} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 15, color: value ? (isDark ? "#fff" : "#111") : (isDark ? "#555" : "#999") }}>
              {value ? formatDateTime(value) : `Select ${field.label}`}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (field.type === "reference") {
      const refValue = value?._ref || value || "—";
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
            <Ionicons name="person-outline" size={18} color={isDark ? "#888" : "#666"} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 15, color: isDark ? "#ccc" : "#666" }}>
              {String(refValue).slice(0, 20)}{String(refValue).length > 20 ? "..." : ""}
            </Text>
          </View>
        </View>
      );
    }

    if (field.type === "footer-links") {
      const linksValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", overflow: "hidden" }}>
            {linksValue.map((link: any, i: number) => (
              <View key={i} style={{ borderBottomWidth: i < linksValue.length - 1 ? 1 : 0, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb", padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: isDark ? "#fff" : "#333", marginBottom: 4 }}>{link.label || "—"}</Text>
                <Text style={{ fontSize: 12, color: isDark ? "#888" : "#999" }}>{link.url || "—"}</Text>
              </View>
            ))}
            {linksValue.length === 0 && (
              <Text style={{ padding: 16, color: isDark ? "#555" : "#ccc", fontSize: 13 }}>Inga länkar</Text>
            )}
          </View>
        </View>
      );
    }

    if (field.type === "social-media") {
      const socialValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", overflow: "hidden" }}>
            {socialValue.map((item: any, i: number) => (
              <View key={i} style={{ borderBottomWidth: i < socialValue.length - 1 ? 1 : 0, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb", padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: isDark ? "#fff" : "#333", marginBottom: 4, textTransform: "capitalize" }}>{item.platform || "—"}</Text>
                <Text style={{ fontSize: 12, color: isDark ? "#888" : "#999" }}>{item.url || "—"}</Text>
              </View>
            ))}
            {socialValue.length === 0 && (
              <Text style={{ padding: 16, color: isDark ? "#555" : "#ccc", fontSize: 13 }}>Inga sociala medier</Text>
            )}
          </View>
        </View>
      );
    }

    if (field.type === "array") {
      const arrValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", overflow: "hidden" }}>
            {(field.arrayItems || []).map(item => {
              const isSelected = arrValue.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    const newArr = isSelected ? arrValue.filter((v: string) => v !== item) : [...arrValue, item];
                    updateField(field.name, newArr);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? "#3b82f6" : (isDark ? "#555" : "#ccc"), backgroundColor: isSelected ? "#3b82f6" : "transparent", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? "#fff" : "#333" }}>
                    {item.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {(!field.arrayItems || field.arrayItems.length === 0) && arrValue.length > 0 && arrValue.map((v: any, i: number) => {
              const displayText = typeof v === "object" && v !== null
                ? (v.label || v.title || v.name || v.text || JSON.stringify(v))
                : String(v);
              return (
                <View key={i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb" }}>
                  <Text style={{ fontSize: 14, color: isDark ? "#ccc" : "#666" }}>{displayText}</Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    if (field.type === "object") {
      const objValue = value || {};
      const subFields: Record<string, string[]> = {
        customerInfo: ["name", "phone", "email"],
        packageDetails: ["size", "weight", "description", "value", "isFragile"],
      };
      const subs = subFields[field.name] || Object.keys(objValue);
      return (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
            {field.label}
          </Text>
          <View style={{ borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#fafafa", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb", overflow: "hidden" }}>
            {subs.map((sub, i) => (
              <View key={sub} style={{ borderBottomWidth: i < subs.length - 1 ? 1 : 0, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#eee", paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: isDark ? "#666" : "#999", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {sub.replace(/([A-Z])/g, " $1").trim()}
                </Text>
                <TextInput
                  style={{ fontSize: 14, color: isDark ? "#fff" : "#333", padding: 0 }}
                  value={objValue[sub] !== undefined ? String(objValue[sub]) : ""}
                  onChangeText={v => updateField(field.name, { ...objValue, [sub]: v })}
                  placeholder={`Enter ${sub}`}
                  placeholderTextColor={isDark ? "#444" : "#ccc"}
                />
              </View>
            ))}
          </View>
        </View>
      );
    }

    // text and number
    const getDisplayValue = (val: any): string => {
      if (val === undefined || val === null) return "";
      if (Array.isArray(val)) {
        return val.map(v => {
          if (typeof v === "string") return v;
          if (typeof v === "object" && v !== null) {
            if (Array.isArray(v.children)) {
              return v.children.map((c: any) => c.text || "").join("");
            }
            return v.text || v.label || v.name || JSON.stringify(v);
          }
          return String(v);
        }).join("\n");
      }
      return String(val);
    };

    return (
      <View>
        <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: isDark ? "#999" : "#666" }}>
          {field.label}
        </Text>
        <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
          <TextInput
            style={{
              color: isDark ? "#fff" : "#111827",
              fontSize: 15,
              padding: 0,
            }}
            value={getDisplayValue(value)}
            onChangeText={v => updateField(field.name, field.type === "number" ? parseFloat(v) || 0 : v)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            placeholderTextColor={isDark ? "#555" : "#999"}
            keyboardType={field.type === "number" ? "numeric" : "default"}
            editable={!field.readOnly}
            multiline={field.name.toLowerCase().includes("note") || field.name.toLowerCase().includes("content") || field.name.toLowerCase().includes("requirement")}
            numberOfLines={field.name.toLowerCase().includes("note") || field.name.toLowerCase().includes("content") || field.name.toLowerCase().includes("requirement") ? 6 : 1}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#111" : "#fff" }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? "#222" : "#eee" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6" }}>
          <Ionicons name="arrow-back" size={20} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: isDark ? "#fff" : "#000" }}>
          {isNew ? "Lägg till" : "Redigera"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {fields.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="alert-circle-outline" size={48} color={isDark ? "#333" : "#ccc"} />
            <Text style={{ marginTop: 16, color: isDark ? "#555" : "#999", fontSize: 16 }}>Inga fält för denna typ</Text>
          </View>
        ) : fields.map(field => (
          <View key={field.name} style={{ marginBottom: 24 }}>
            {renderField(field)}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: isDark ? "#111" : "#fff", borderTopWidth: 1, borderTopColor: isDark ? "#222" : "#eee" }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 18,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: saving ? "#6b7280" : "#3b82f6",
            shadowColor: "#3b82f6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              {isNew ? "SKAPA" : "SPARA ÄNDRINGAR"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date/Time Picker Modal */}
      {showPicker && (
        <Modal transparent visible={showPicker} animationType="slide">
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View style={{ backgroundColor: isDark ? "#1a1a1a" : "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? "#333" : "#eee" }}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>Avbryt</Text>
                </TouchableOpacity>
                <Text style={{ color: isDark ? "#fff" : "#000", fontSize: 16, fontWeight: "bold" }}>
                  {pickerField ? fields.find(f => f.name === pickerField)?.label : ""}
                </Text>
                <TouchableOpacity onPress={handleDateDone}>
                  <Text style={{ color: "#3b82f6", fontSize: 16, fontWeight: "600" }}>Klar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                style={{ height: 220 }}
                textColor={isDark ? "#fff" : "#000"}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}