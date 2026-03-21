import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";
import { client } from "@/sanityClient";

export default function AdminFormScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [schema, setSchema] = useState<any[]>([]);
  
  // Picker states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | "datetime">("date");
  
  // Selection states
  const [showSelector, setShowSelector] = useState(false);
  const [selectorField, setSelectorField] = useState<string | null>(null);
  const [selectorOptions, setSelectorOptions] = useState<{ title: string; value: any }[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchItem();
    }
    setSchema(getSchemaFields(type));
  }, [type, id]);

  const fetchItem = async () => {
    try {
      const data = await client.getDocument(id!);
      setFormData(data || {});
    } catch (error) {
      console.error("Fetch failed:", error);
      Alert.alert("Fel", "Kunde inte hämta data.");
    } finally {
      setLoading(false);
    }
  };

  const getSchemaFields = (entityType: string) => {
    const commonStatus = [
      { title: "Väntar", value: "pending" },
      { title: "Bekräftad", value: "confirmed" },
      { title: "Pågående", value: "in_progress" },
      { title: "Slutförd", value: "completed" },
      { title: "Avbruten", value: "cancelled" },
    ];

    const commonRoutes = [
      { title: "Stockholm → Tunis", value: "stockholm_tunis" },
      { title: "Tunis → Stockholm", value: "tunis_stockholm" },
      { title: "Tunis → Sousse", value: "tunis_sousse" },
      { title: "Tunis → Sfax", value: "tunis_sfax" },
      { title: "Inrikes (Sverige)", value: "sweden_domestic" },
      { title: "Inrikes (Tunisien)", value: "tunisia_domestic" },
    ];

    const vehicleTypes = [
      { title: "Cargo Van", value: "cargo_van" },
      { title: "Lätt Lastbil", value: "light_truck" },
      { title: "Lastbil", value: "heavy_truck" },
      { title: "Containerfartyg", value: "container_ship" },
      { title: "Flygfrakt", value: "air_freight" },
    ];

    const paymentMethods = [
      { title: "Stripe", value: "stripe" },
      { title: "Poäng", value: "points" },
      { title: "Kombinerad", value: "combined" },
      { title: "Kontant", value: "cash" },
    ];

    switch (entityType) {
      case "users":
        return [
          { name: "email", label: "Email", type: "text" },
          { name: "clerkId", label: "Clerk ID", type: "text" },
          { name: "points", label: "Poäng", type: "number" },
          { name: "isAdmin", label: "Är Admin", type: "boolean" },
          { name: "isDriver", label: "Är Chaufför", type: "boolean" },
        ];
      case "shipping-orders":
        return [
          { name: "customerInfo.name", label: "Kundnamn", type: "text" },
          { name: "customerInfo.phone", label: "Telefon", type: "text" },
          { name: "pickupAddress", label: "Upphämtningsadress", type: "text" },
          { name: "deliveryAddress", label: "Leveransadress", type: "text" },
          { name: "route", label: "Rutt", type: "select", options: commonRoutes },
          { name: "scheduledDateTime", label: "Datum & Tid", type: "datetime" },
          { name: "packageDetails.weight", label: "Vikt (kg)", type: "number" },
          { name: "packageDetails.dimensions.length", label: "Längd (cm)", type: "number" },
          { name: "packageDetails.dimensions.width", label: "Bredd (cm)", type: "number" },
          { name: "packageDetails.dimensions.height", label: "Höjd (cm)", type: "number" },
          { name: "packageDetails.description", label: "Beskrivning", type: "text", multiline: true },
          { name: "packageDetails.value", label: "Värde (SEK)", type: "number" },
          { name: "packageDetails.isFragile", label: "Ömtåligt", type: "boolean" },
          { name: "shippingSpeed", label: "Hastighet", type: "select", options: [
            { title: "Standard (3-5 dagar)", value: "standard" },
            { title: "Express (1-2 dagar)", value: "express" },
            { title: "Overnight", value: "overnight" },
          ]},
          { name: "requiresSignature", label: "Kräver signatur", type: "boolean" },
          { name: "insuranceValue", label: "Försäkringsvärde", type: "number" },
          { name: "totalPrice", label: "Totalpris (SEK)", type: "number" },
          { name: "pointsUsed", label: "Poäng använda", type: "number" },
          { name: "status", label: "Status", type: "select", options: commonStatus },
          { name: "paymentMethod", label: "Betalningsmetod", type: "select", options: paymentMethods },
          { name: "isPaid", label: "Betald", type: "boolean" },
          { name: "driverId", label: "Chaufför ID (Clerk)", type: "text" },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "container-shipping-orders":
        return [
          { name: "customerInfo.name", label: "Kundnamn", type: "text" },
          { name: "customerInfo.phone", label: "Telefon", type: "text" },
          { name: "pickupAddress", label: "Upphämtningsadress", type: "text" },
          { name: "deliveryAddress", label: "Leveransadress", type: "text" },
          { name: "scheduledDateTime", label: "Datum & Tid", type: "datetime" },
          { name: "packageDetails.size", label: "Storlek", type: "select", options: [
            { title: "20ft Container", value: "20ft" },
            { title: "40ft Container", value: "40ft" },
          ]},
          { name: "totalPrice", label: "Totalpris (SEK)", type: "number" },
          { name: "status", label: "Status", type: "select", options: commonStatus },
          { name: "isPaid", label: "Betald", type: "boolean" },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "taxi-orders":
        return [
          { name: "customerInfo.name", label: "Kundnamn", type: "text" },
          { name: "customerInfo.phone", label: "Telefon", type: "text" },
          { name: "pickupAddress", label: "Upphämtningsadress", type: "text" },
          { name: "destinationAddress", label: "Destination", type: "text" },
          { name: "scheduledDateTime", label: "Datum & Tid", type: "datetime" },
          { name: "numberOfPassengers", label: "Antal passagerare", type: "number" },
          { name: "isRoundTrip", label: "Tur & Retur", type: "boolean" },
          { name: "returnDateTime", label: "Retur Datum & Tid", type: "datetime" },
          { name: "estimatedDistance", label: "Estimerat avstånd (km)", type: "number" },
          { name: "totalPrice", label: "Totalpris (SEK)", type: "number" },
          { name: "pointsUsed", label: "Poäng använda", type: "number" },
          { name: "status", label: "Status", type: "select", options: commonStatus },
          { name: "paymentMethod", label: "Betalningsmetod", type: "select", options: paymentMethods },
          { name: "isPaid", label: "Betald", type: "boolean" },
          { name: "driverId", label: "Chaufför ID (Clerk)", type: "text" },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "move-orders":
        return [
          { name: "customerInfo.name", label: "Kundnamn", type: "text" },
          { name: "customerInfo.phone", label: "Telefon", type: "text" },
          { name: "pickupAddress", label: "Från Adress", type: "text" },
          { name: "deliveryAddress", label: "Till Adress", type: "text" },
          { name: "scheduledDateTime", label: "Datum & Tid", type: "datetime" },
          { name: "numberOfItems", label: "Antal föremål", type: "number" },
          { name: "numberOfPersons", label: "Antal personer", type: "number" },
          { name: "hasElevator", label: "Hiss finns", type: "boolean" },
          { name: "itemCategories", label: "Kategorier (en per rad)", type: "array-string", multiline: true },
          { name: "estimatedHours", label: "Estimerade timmar", type: "number" },
          { name: "totalPrice", label: "Totalpris (SEK)", type: "number" },
          { name: "pointsUsed", label: "Poäng använda", type: "number" },
          { name: "paymentMethod", label: "Betalningsmetod", type: "select", options: paymentMethods },
          { name: "status", label: "Status", type: "select", options: commonStatus },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "move-clean-orders":
        return [
          { name: "customerInfo.name", label: "Kundnamn", type: "text" },
          { name: "customerInfo.phone", label: "Telefon", type: "text" },
          { name: "pickupAddress", label: "Från Adress", type: "text" },
          { name: "deliveryAddress", label: "Till Adress", type: "text" },
          { name: "scheduledDateTime", label: "Datum & Tid", type: "datetime" },
          { name: "numberOfItems", label: "Antal föremål", type: "number" },
          { name: "numberOfPersons", label: "Antal personer", type: "number" },
          { name: "hasElevator", label: "Hiss finns", type: "boolean" },
          { name: "itemCategories", label: "Kategorier (en per rad)", type: "array-string", multiline: true },
          { name: "cleaningAreas", label: "Städområden (en per rad)", type: "array-string", multiline: true },
          { name: "cleaningIntensity", label: "Städintensitet", type: "select", options: [
            { title: "Standard", value: "basic" },
            { title: "Djuprengöring", value: "deep" },
            { title: "Flyttstäd", value: "move_out" },
          ]},
          { name: "cleaningSupplies", label: "Vi står för material", type: "boolean" },
          { name: "estimatedHours", label: "Estimerade timmar", type: "number" },
          { name: "totalPrice", label: "Totalpris (SEK)", type: "number" },
          { name: "pointsUsed", label: "Poäng använda", type: "number" },
          { name: "paymentMethod", label: "Betalningsmetod", type: "select", options: paymentMethods },
          { name: "status", label: "Status", type: "select", options: commonStatus },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "announcements":
        return [
          { name: "title", label: "Rubrik", type: "text" },
          { name: "message", label: "Kort text", type: "text" },
          { name: "description", label: "Lång text", type: "text", multiline: true },
          { name: "icon", label: "Ikon (Ionicons)", type: "text" },
          { name: "link", label: "Länk (URL)", type: "text" },
        ];
      case "shipping-schedules":
      case "container-shipping-schedules":
        return [
          { name: "route", label: "Rutt", type: "select", options: commonRoutes },
          { name: "departureTime", label: "Avgångstid", type: "datetime" },
          { name: "capacity", label: "Total Kapacitet (kg)", type: "number" },
          { name: "availableCapacity", label: "Tillgänglig Kapacitet (kg)", type: "number" },
          { name: "vehicleType", label: "Fordonstyp", type: "select", options: vehicleTypes },
          { name: "status", label: "Status", type: "select", options: [
            { title: "Tillgänglig", value: "available" },
            { title: "Fullbokat", value: "full" },
            { title: "Avgått", value: "departed" },
            { title: "Inställd", value: "cancelled" },
          ]},
          { name: "assignedDriver", label: "Tilldelad Chaufför (Clerk ID)", type: "text" },
          { name: "isActive", label: "Visa på karta", type: "boolean" },
          { name: "notes", label: "Noteringar", type: "text", multiline: true },
        ];
      case "live-status":
        return [
          { name: "title", label: "Rubrik", type: "text" },
          { name: "statuses", label: "Statusmeddelanden (ett per rad)", type: "array-string", multiline: true },
          { name: "isActive", label: "Är Aktiv", type: "boolean" },
        ];
      case "friend-requests":
        return [
          { name: "fromUserName", label: "Från", type: "text" },
          { name: "toUserId", label: "Till ID", type: "text" },
          { name: "pointsToTransfer", label: "Poäng", type: "number" },
          { name: "status", label: "Status", type: "select", options: commonStatus },
        ];
      case "footer":
        return [
          { name: "copyrightText", label: "Copyright", type: "text" },
          { 
            name: "footerLinks", 
            label: "Sidfotslänkar", 
            type: "array-object",
            itemLabel: "Länk",
            schema: [
              { name: "label", label: "Text", type: "text" },
              { name: "url", label: "URL", type: "text" },
            ]
          },
          { 
            name: "socialMedia", 
            label: "Sociala Medier", 
            type: "array-object",
            itemLabel: "Plattform",
            schema: [
              { name: "platform", label: "Namn", type: "text" },
              { name: "url", label: "URL", type: "text" },
            ]
          },
        ];
      case "terms":
      case "privacy":
        return [
          { name: "title", label: "Rubrik", type: "text" },
          { name: "content", label: "Innehåll", type: "rich-text", multiline: true },
          { name: "lastUpdated", label: "Senast Uppdaterad", type: "date" },
        ];
      default:
        const keys = Object.keys(formData).filter((k) => !k.startsWith("_") && typeof formData[k] !== 'object');
        return keys.map((k) => ({
          name: k,
          label: k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1'),
          type: typeof formData[k] === "boolean" ? "boolean" : (typeof formData[k] === 'number' ? 'number' : "text"),
        }));
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const lastObj = keys.reduce((prev, curr) => {
      if (!prev[curr]) prev[curr] = {};
      return prev[curr];
    }, obj);
    lastObj[lastKey] = value;
    return { ...obj };
  };

  const getPlainFromPortableText = (blocks: any) => {
    if (!Array.isArray(blocks)) return blocks?.toString() || "";
    return blocks
      .map(block => {
        if (block._type !== 'block' || !block.children) {
          return '';
        }
        return block.children.map((child: any) => child.text).join('');
      })
      .join('\n\n');
  };

  const stringToPortableText = (text: string) => {
    return [
      {
        _type: 'block',
        _key: Math.random().toString(36).substring(7),
        children: [
          {
            _type: 'span',
            _key: Math.random().toString(36).substring(7),
            text: text,
            marks: []
          }
        ],
        markDefs: [],
        style: 'normal'
      }
    ];
  };

  const formatDateForDisplay = (val: any, fieldType: string) => {
    if (!val) return "";
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return val;
      if (fieldType === "time") {
        return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
      } else if (fieldType === "date") {
        return date.toLocaleDateString("sv-SE");
      } else {
        return date.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
      }
    } catch {
      return val;
    }
  };

  const processDataForSave = (data: any, fields: any[]) => {
    const result = { ...data };
    fields.forEach(field => {
      const val = getNestedValue(result, field.name);
      
      if (field.type === 'number') {
        if (val !== undefined && val !== null && val !== "") {
          const num = parseFloat(val);
          setNestedValue(result, field.name, isNaN(num) ? 0 : num);
        }
      } else if (field.type === 'rich-text') {
        if (typeof val === 'string') {
          setNestedValue(result, field.name, stringToPortableText(val));
        }
      } else if (field.type === 'array-string') {
        const val = getNestedValue(result, field.name);
        if (Array.isArray(val)) {
          setNestedValue(result, field.name, val.map(s => s.trim()).filter(s => s !== ""));
        } else if (typeof val === 'string') {
          // Fallback if someone uses the old way (shouldn't happen with new UI)
          setNestedValue(result, field.name, val.split('\n').map(s => s.trim()).filter(s => s !== ""));
        }
      }
    });
    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const processedData = processDataForSave(formData, schema);
      
      if (isNew) {
        const schemaMap: any = {
          users: "users",
          announcements: "announcement",
          "live-status": "liveStatus",
          "shipping-schedules": "shippingSchedule",
          "container-shipping-schedules": "containerShippingSchedule",
          "shipping-orders": "shippingOrder",
          "container-shipping-orders": "containerShippingOrder",
          "taxi-orders": "taxiOrder",
          "move-orders": "moveOrder",
          "move-clean-orders": "moveCleaningOrder",
          "friend-requests": "friendRequest",
          footer: "footer",
          terms: "terms",
          privacy: "policy",
        };

        const docType = schemaMap[type] || type;

        // If activating a live-status, deactivate others
        if (docType === "liveStatus" && processedData.isActive) {
          const activeDocs = await client.fetch('*[_type == "liveStatus" && isActive == true]._id');
          for (const docId of activeDocs) {
            await client.patch(docId).set({ isActive: false }).commit();
          }
        }

        await client.create({
          _type: docType,
          ...processedData,
        });
      } else {
        const docType = (await client.getDocument(id!))?._type;
        
        // If activating a live-status, deactivate others
        if (docType === "liveStatus" && processedData.isActive) {
          const activeDocs = await client.fetch('*[_type == "liveStatus" && isActive == true && _id != $id]._id', { id });
          for (const docId of activeDocs) {
            await client.patch(docId).set({ isActive: false }).commit();
          }
        }

        await client.patch(id!).set(processedData).commit();
      }
      Alert.alert("Klart", "Data har sparats.");
      router.back();
    } catch (error: any) {
      console.error("Save failed:", error);
      Alert.alert("Fel", "Sparandet misslyckades: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const SelectorModal = () => (
    <Modal
      visible={showSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSelector(false)}
    >
      <View className="flex-1 justify-end">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowSelector(false)} 
          className="absolute inset-0 bg-black/50" 
        />
        <View className={`rounded-t-[40px] p-6 pb-12 ${isDark ? "bg-dark shadow-2xl" : "bg-white shadow-lg"}`}>
          <View className="flex-row items-center justify-between mb-6">
            <AutoText className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
              Välj Alternativ
            </AutoText>
            <TouchableOpacity onPress={() => setShowSelector(false)} className={`p-2 rounded-full ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
              <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectorOptions.map((opt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setFormData(setNestedValue({ ...formData }, selectorField!, opt.value));
                  setShowSelector(false);
                }}
                className={`py-5 flex-row items-center justify-between border-b ${isDark ? "border-white/5" : "border-gray-50"}`}
              >
                <AutoText className={`text-base ${getNestedValue(formData, selectorField!) === opt.value ? "text-primary font-bold" : (isDark ? "text-white" : "text-gray-900")}`}>
                  {opt.title}
                </AutoText>
                {getNestedValue(formData, selectorField!) === opt.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${isDark ? "bg-dark" : "bg-white"}`}
      >
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        
        <View className="flex-1 items-center">
          <AutoText className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
            {isNew ? "Lägg till" : "Redigera"}
          </AutoText>
        </View>

        <View className="w-10" />
      </View>

      <View className="px-6 mt-4 mb-2">
           <AutoText className="text-gray-500 text-sm font-bold uppercase tracking-widest">
               {type.replace(/-/g, ' ')}
           </AutoText>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {schema.map((field) => (
          <View key={field.name} className="mb-6">
            <AutoText
              className={`text-sm font-bold mb-2 uppercase tracking-widest ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              {field.label}
            </AutoText>

            {field.type === "boolean" ? (
              <View className="flex-row items-center justify-between">
                <AutoText className={isDark ? "text-white" : "text-black"}>
                  {field.label}
                </AutoText>
                <Switch
                  value={getNestedValue(formData, field.name) || false}
                  onValueChange={(val) =>
                    setFormData(setNestedValue({ ...formData }, field.name, val))
                  }
                  trackColor={{ false: "#767577", true: "#3b82f6" }}
                />
              </View>
            ) : field.type === "date" || field.type === "time" || field.type === "datetime" ? (
              <TouchableOpacity
                onPress={() => {
                  setPickerField(field.name);
                  setPickerMode(field.type === "time" ? "time" : (field.type === "date" ? "date" : "datetime"));
                  setShowPicker(true);
                }}
                className={`p-4 rounded-2xl flex-row items-center justify-between ${isDark ? "bg-white/5" : "bg-gray-100"}`}
              >
                <AutoText className={isDark ? "text-white" : "text-black"}>
                  {formatDateForDisplay(getNestedValue(formData, field.name), field.type) || `Välj ${field.label.toLowerCase()}`}
                </AutoText>
                <Ionicons name={field.type === "time" ? "time-outline" : "calendar-outline"} size={20} color={isDark ? "#aaa" : "#666"} />
              </TouchableOpacity>
            ) : field.type === "select" ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectorField(field.name);
                  setSelectorOptions(field.options);
                  setShowSelector(true);
                }}
                className={`p-4 rounded-2xl flex-row items-center justify-between ${isDark ? "bg-white/5" : "bg-gray-100"}`}
              >
                <AutoText className={isDark ? "text-white" : "text-black"}>
                  {field.options.find((o: any) => o.value === getNestedValue(formData, field.name))?.title || `Välj ${field.label.toLowerCase()}`}
                </AutoText>
                <Ionicons name="chevron-down" size={20} color={isDark ? "#aaa" : "#666"} />
              </TouchableOpacity>
            ) : field.type === 'array-string' ? (
              <View>
                {(Array.isArray(getNestedValue(formData, field.name)) 
                  ? getNestedValue(formData, field.name) 
                  : (getNestedValue(formData, field.name) ? [getNestedValue(formData, field.name)] : [""])
                ).map((item: string, idx: number) => (
                  <View key={idx} className="flex-row items-center mb-2">
                    <TextInput
                      className={`flex-1 p-4 rounded-2xl ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-black"}`}
                      value={item}
                      onChangeText={(val) => {
                        const current = Array.isArray(getNestedValue(formData, field.name)) 
                          ? [...getNestedValue(formData, field.name)] 
                          : [getNestedValue(formData, field.name)];
                        current[idx] = val;
                        setFormData(setNestedValue({ ...formData }, field.name, current));
                      }}
                      placeholder={`Post ${idx + 1}`}
                      placeholderTextColor={isDark ? "#555" : "#999"}
                    />
                    <TouchableOpacity 
                      onPress={() => {
                        const current = [...(getNestedValue(formData, field.name) || [])];
                        current.splice(idx, 1);
                        setFormData(setNestedValue({ ...formData }, field.name, current));
                      }}
                      className="ml-2 p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity 
                  onPress={() => {
                    const current = Array.isArray(getNestedValue(formData, field.name)) 
                      ? [...getNestedValue(formData, field.name)] 
                      : (getNestedValue(formData, field.name) ? [getNestedValue(formData, field.name)] : []);
                    current.push("");
                    setFormData(setNestedValue({ ...formData }, field.name, current));
                  }}
                  className={`mt-2 p-4 rounded-2xl border-2 border-dashed flex-row items-center justify-center ${isDark ? "border-white/10" : "border-gray-200"}`}
                >
                  <Ionicons name="add-circle-outline" size={20} color={isDark ? "#aaa" : "#666"} className="mr-2" />
                  <AutoText className={isDark ? "text-gray-400" : "text-gray-500"}>Lägg till rad</AutoText>
                </TouchableOpacity>
              </View>
            ) : field.type === 'array-object' ? (
              <View>
                {(Array.isArray(getNestedValue(formData, field.name)) ? getNestedValue(formData, field.name) : []).map((item: any, idx: number) => (
                  <View key={idx} className={`mb-4 p-4 rounded-3xl border ${isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"}`}>
                    <View className="flex-row items-center justify-between mb-3">
                      <AutoText className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {field.itemLabel || "Objekt"} {idx + 1}
                      </AutoText>
                      <TouchableOpacity 
                        onPress={() => {
                          const current = [...getNestedValue(formData, field.name)];
                          current.splice(idx, 1);
                          setFormData(setNestedValue({ ...formData }, field.name, current));
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                    {field.schema.map((subField: any) => (
                      <View key={subField.name} className="mb-3">
                        <AutoText className={`text-[10px] font-bold mb-1 uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {subField.label}
                        </AutoText>
                        <TextInput
                          className={`p-3 rounded-xl ${isDark ? "bg-black/20 text-white" : "bg-white text-black"}`}
                          value={item[subField.name] || ""}
                          onChangeText={(val) => {
                            const current = [...getNestedValue(formData, field.name)];
                            current[idx] = { ...current[idx], [subField.name]: val };
                            setFormData(setNestedValue({ ...formData }, field.name, current));
                          }}
                          placeholder={`Ange ${subField.label.toLowerCase()}`}
                          placeholderTextColor={isDark ? "#444" : "#ccc"}
                        />
                      </View>
                    ))}
                  </View>
                ))}
                <TouchableOpacity 
                  onPress={() => {
                    const current = [...(getNestedValue(formData, field.name) || [])];
                    const newItem = {};
                    field.schema.forEach((sf: any) => (newItem as any)[sf.name] = "");
                    current.push(newItem);
                    setFormData(setNestedValue({ ...formData }, field.name, current));
                  }}
                  className={`p-4 rounded-2xl border-2 border-dashed flex-row items-center justify-center ${isDark ? "border-white/10" : "border-gray-200"}`}
                >
                  <Ionicons name="add" size={20} color={isDark ? "#aaa" : "#666"} />
                  <AutoText className={`ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Lägg till {field.itemLabel?.toLowerCase() || "objekt"}</AutoText>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                className={`p-4 rounded-2xl ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-black"}`}
                value={
                  field.type === 'rich-text' 
                    ? (typeof getNestedValue(formData, field.name) === 'string' 
                        ? getNestedValue(formData, field.name) 
                        : getPlainFromPortableText(getNestedValue(formData, field.name))) 
                    : getNestedValue(formData, field.name)?.toString() || ""
                }
                onChangeText={(val) => {
                  let finalVal: any = val;
                  if (field.type === 'number') {
                    finalVal = val === "" ? 0 : (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
                  }
                  setFormData(setNestedValue({ ...formData }, field.name, finalVal))
                }}
                placeholder={`Ange ${field.label.toLowerCase()}`}
                placeholderTextColor={isDark ? "#555" : "#999"}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 8 : 1}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`mt-6 py-5 rounded-[32px] items-center justify-center shadow-xl ${saving ? "bg-gray-500" : "bg-primary"}`}
          style={{
            shadowColor: "#3b82f6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AutoText className="text-white font-black text-lg tracking-widest">
              {isNew ? "SKAPA NY" : "UPPDATERA"}
            </AutoText>
          )}
        </TouchableOpacity>


        <View className="h-10" />
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={(() => {
            const val = getNestedValue(formData, pickerField!);
            const d = val ? new Date(val) : new Date();
            return isNaN(d.getTime()) ? new Date() : d;
          })()}
          mode={pickerMode as any}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={isDark ? "dark" : "light"}
          textColor={isDark ? "#FFFFFF" : "#000000"}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (selectedDate) {
              setFormData(setNestedValue({ ...formData }, pickerField!, selectedDate.toISOString()));
            }
          }}
        />
      )}

      <SelectorModal />
    </SafeAreaView>
  );
}
