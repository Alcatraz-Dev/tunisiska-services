import React, { useState, useEffect } from "react";
import { View, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Modal, Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { client } from "@/sanityClient";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import ThemedText from "@/app/components/ui/ThemedText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { useLanguage } from "@/app/hooks/useLanguage";
import { currentDateLocale } from "@/app/lib/time";
import {
  broadcastAnnouncement,
  broadcastToAllUsers,
} from "@/app/lib/broadcastNotification";

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

type FieldType = "text" | "portable-text" | "number" | "boolean" | "select" | "datetime" | "array" | "object" | "reference" | "footer-links" | "social-media";

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
    { name: "content", label: "Content", type: "portable-text" },
    { name: "lastUpdated", label: "Last Updated", type: "datetime", required: true },
  ],
  privacy: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "content", label: "Content", type: "portable-text" },
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

/**
 * A stable, unique slug for an announcement created in the admin form.
 * Arabic titles slugify to an empty string, so those fall back to "nyhet".
 */
function announcementSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "nyhet"}-${Date.now().toString(36)}`;
}

function formatDateTime(val: any): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    return d.toLocaleString(currentDateLocale(), {
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

function plainTextToPortableText(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;

  return value
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      _type: "block",
      _key: `legal-block-${index}`,
      style: "normal",
      markDefs: [],
      children: [{
        _type: "span",
        _key: `legal-span-${index}`,
        marks: [],
        text,
      }],
    }));
}

export default function AdminAddScreen() {
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const { language } = useLanguage();
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
      void showAlert("Error", "No fields defined for this type");
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
          dataToSave[field.name] = field.type === "portable-text"
            ? plainTextToPortableText(val)
            : val;
        }
      }

      // The admin form only collects title, message and date, but the News tab
      // orders by date and opens the detail screen by slug — without these a
      // record created here would never be readable in the app.
      if (docType === "announcement") {
        const now = new Date().toISOString();
        if (isNew) {
          dataToSave.slug = {
            _type: "slug",
            current: announcementSlug(String(dataToSave.title ?? "")),
          };
          dataToSave.date = dataToSave.date || now;
          dataToSave.publishedAt = now;
          dataToSave.status = "published";
          dataToSave.source = "manual";
        } else if (dataToSave.date) {
          dataToSave.publishedAt = dataToSave.date;
        }
      }

      if (isNew) {
        const result = await client.create({ _type: docType, ...dataToSave });
        console.log(`[AdminForm] Created doc:`, result);
        if (docType === "announcement") {
          // Best effort: the announcement is saved already, so a push failure
          // must not turn a successful publish into an error dialog.
          void broadcastAnnouncement({
            title: String(dataToSave.title ?? ""),
            message: String(dataToSave.message ?? dataToSave.description ?? ""),
          }).catch((error) =>
            console.warn("[AdminForm] Announcement notification failed:", error),
          );
        } else if (
          docType === "shippingSchedule" ||
          docType === "containerShippingSchedule"
        ) {
          // A published departure is news the customer can act on, so it goes
          // to every registered device with the route and time.
          const routeLabel =
            ROUTE_LABELS[String(dataToSave.route ?? "")] ??
            String(dataToSave.route ?? "").replace(/_/g, " ");
          const vehicleLabel = ROUTE_LABELS[String(dataToSave.vehicle ?? "")] ?? "";
          const when = dataToSave.departureTime
            ? formatDateTime(dataToSave.departureTime)
            : "";

          void broadcastToAllUsers({
            type: "update",
            title: routeLabel
              ? `New departure: ${routeLabel}`
              : "New departure added",
            message: [when, vehicleLabel].filter(Boolean).join(" · ") ||
              "A new departure has been added. Check the trips screen for details.",
          }).catch((error) =>
            console.warn("[AdminForm] Departure notification failed:", error),
          );
        }
      } else {
        await client.patch(id).set(dataToSave).commit();
      }
      void showAlert("Success", isNew ? "Created successfully" : "Updated successfully");
      router.back();
    } catch (error: any) {
      console.error(`[AdminForm] Save error:`, error);
      void showAlert("Error", error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FieldDef) => {
    const value = formData[field.name];

    if (field.type === "boolean") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, backgroundColor: theme.surfaceAlt }}>
          <ThemedText style={{ color: theme.textPrimary, flex: 1 }}>{field.label}</ThemedText>
          <Switch
            value={value || false}
            onValueChange={v => updateField(field.name, v)}
            trackColor={{ false: theme.borderStrong, true: theme.primary }}
          />
        </View>
      );
    }

    if (field.type === "select") {
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(field.options || []).map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => updateField(field.name, opt)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: value === opt ? theme.primary : theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: value === opt ? theme.primary : theme.border,
                }}
              >
                <ThemedText style={{ fontSize: 12, fontWeight: "bold", color: value === opt ? theme.textOnAccent : theme.textPrimary }}>
                  {ROUTE_LABELS[opt] || opt}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (field.type === "datetime") {
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <TouchableOpacity
            onPress={() => !field.readOnly && handleDatePress(field.name)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderRadius: 16,
              backgroundColor: field.readOnly ? theme.surfaceSunken : theme.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: field.readOnly ? 0.6 : 1,
            }}
          >
            <AppIcon name="calendar-outline" size={18} color={theme.textTertiary} style={{ marginRight: 10 }} />
            <ThemedText style={{ fontSize: 15, color: value ? (theme.textPrimary) : (theme.textQuaternary) }}>
              {value ? formatDateTime(value) : `Select ${field.label}`}
            </ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    if (field.type === "reference") {
      const refValue = value?._ref || value || "—";
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }}>
            <AppIcon name="person-outline" size={18} color={theme.textTertiary} style={{ marginRight: 10 }} />
            <ThemedText style={{ fontSize: 15, color: theme.textSecondary }}>
              {String(refValue).slice(0, 20)}{String(refValue).length > 20 ? "..." : ""}
            </ThemedText>
          </View>
        </View>
      );
    }

    if (field.type === "footer-links") {
      const linksValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ borderRadius: 16, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            {linksValue.map((link: any, i: number) => (
              <View key={i} style={{ borderBottomWidth: i < linksValue.length - 1 ? 1 : 0, borderBottomColor: theme.separator, padding: 16 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: theme.textPrimary, marginBottom: 4 }}>{link.label || "—"}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textQuaternary }}>{link.url || "—"}</ThemedText>
              </View>
            ))}
            {linksValue.length === 0 && (
              <ThemedText style={{ padding: 16, color: theme.textQuaternary, fontSize: 13 }}>No links</ThemedText>
            )}
          </View>
        </View>
      );
    }

    if (field.type === "social-media") {
      const socialValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ borderRadius: 16, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            {socialValue.map((item: any, i: number) => (
              <View key={i} style={{ borderBottomWidth: i < socialValue.length - 1 ? 1 : 0, borderBottomColor: theme.separator, padding: 16 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: theme.textPrimary, marginBottom: 4, textTransform: "capitalize" }}>{item.platform || "—"}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textQuaternary }}>{item.url || "—"}</ThemedText>
              </View>
            ))}
            {socialValue.length === 0 && (
              <ThemedText style={{ padding: 16, color: theme.textQuaternary, fontSize: 13 }}>No social media</ThemedText>
            )}
          </View>
        </View>
      );
    }

    if (field.type === "array") {
      const arrValue = Array.isArray(value) ? value : [];
      return (
        <View>
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ borderRadius: 16, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
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
                    borderBottomColor: theme.separator,
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? theme.primary : theme.borderStrong, backgroundColor: isSelected ? theme.primary : "transparent", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    {isSelected && <AppIcon name="checkmark" size={14} color="#fff" />}
                  </View>
                  <ThemedText style={{ fontSize: 14, color: theme.textPrimary }}>
                    {item.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
            {(!field.arrayItems || field.arrayItems.length === 0) && arrValue.length > 0 && arrValue.map((v: any, i: number) => {
              const displayText = typeof v === "object" && v !== null
                ? (v.label || v.title || v.name || v.text || JSON.stringify(v))
                : String(v);
              return (
                <View key={i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.separator }}>
                  <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>{displayText}</ThemedText>
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
          <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
            {field.label}
          </ThemedText>
          <View style={{ borderRadius: 16, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            {subs.map((sub, i) => (
              <View key={sub} style={{ borderBottomWidth: i < subs.length - 1 ? 1 : 0, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#eee", paddingHorizontal: 16, paddingVertical: 12 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: "bold", color: theme.textTertiary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {sub.replace(/([A-Z])/g, " $1").trim()}
                </ThemedText>
                <Input
                  style={{ fontSize: 14, color: theme.textPrimary, padding: 0 }}
                  value={objValue[sub] !== undefined ? String(objValue[sub]) : ""}
                  onChangeText={v => updateField(field.name, { ...objValue, [sub]: v })}
                  placeholder={`Enter ${sub}`}
                  placeholderTextColor={theme.textQuaternary}
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
        }).join("\n\n");
      }
      return String(val);
    };

    return (
      <View>
        <ThemedText style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: theme.textTertiary }}>
          {field.label}
        </ThemedText>
        <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <Input
            style={{
              color: theme.textPrimary,
              fontSize: 15,
              padding: 0,
            }}
            value={getDisplayValue(value)}
            onChangeText={v => updateField(field.name, field.type === "number" ? parseFloat(v) || 0 : v)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            placeholderTextColor={theme.textQuaternary}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title={isNew ? "Create record" : "Edit record"}
        subtitle={isNew ? "Add operational information" : "Update operational information"}
        showBack
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {fields.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <AppIcon name="alert-circle-outline" size={48} color={theme.textQuaternary} />
            <ThemedText style={{ marginTop: 16, color: theme.textQuaternary, fontSize: 16 }}>No fields for this type</ThemedText>
          </View>
        ) : fields.map(field => (
          <View key={field.name} style={{ marginBottom: 24 }}>
            {renderField(field)}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
        <PrimaryButton label={isNew ? "Create" : "Save changes"} onPress={handleSave} loading={saving} />
      </View>

      {/* Date/Time Picker Modal */}
      {showPicker && (
        <Modal transparent visible={showPicker} animationType="slide">
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <ThemedText style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "bold" }}>
                  {pickerField ? fields.find(f => f.name === pickerField)?.label : ""}
                </ThemedText>
                <TouchableOpacity onPress={handleDateDone}>
                  <ThemedText style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="datetime"
                display="spinner"
                locale={currentDateLocale(language).replace("-", "_")}
                onChange={handleDateChange}
                style={{ height: 220 }}
                textColor={theme.textPrimary}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
