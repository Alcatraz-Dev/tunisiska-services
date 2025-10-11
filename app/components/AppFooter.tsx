import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AutoText } from "./ui/AutoText";
import { client } from "@/sanityClient";
import { footerQuery } from "../hooks/useQuery";
import { Footer } from "../schemas/serviceSchemas";
import { showAlert } from "../utils/showAlert";

export default function AppFooter() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [footer, setFooter] = useState<Footer | null>(null);

  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const data = await client.fetch(footerQuery);
        setFooter(data);
      } catch (error) {
        console.error("Error fetching footer:", error);
      }
    };
    fetchFooter();
  }, []);
  if (!footer) {
    return null; // Or return a loading state
  }

  const getSocialIconName = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return 'logo-facebook';
      case 'instagram':
        return 'logo-instagram';
      case 'whatsapp':
        return 'logo-whatsapp';
      case 'twitter':
        return 'logo-twitter';
      case 'linkedin':
        return 'logo-linkedin';
      case 'youtube':
        return 'logo-youtube';
      default:
        return 'globe-outline';
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Unable to open URL:', error);
      await showAlert('Error', 'Unable to open link');
    }
  };

  const handleLinkPress = (url: string) => {
    if (url.startsWith('/')) {
      router.push(url as any);
    } else {
      openUrl(url);
    }
  };

  return (
    <View
      className={`mt-6 py-6 border-t mb-20 ${
        isDark ? "border-gray-700" : "border-gray-200"
      }`}
    >
      {/* Links */}
      {footer.links && footer.links.length > 0 && (
        <View className="flex-row justify-center mb-3">
          {footer.links.map((link, index) => (
            <TouchableOpacity
              key={index}
              className="mx-3"
              onPress={() => handleLinkPress(link.url)}
              activeOpacity={0.8}
            >
              <AutoText
                className={`text-xs font-medium ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {link.label}
              </AutoText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Social Icons */}
      {footer.socialMedia && footer.socialMedia.length > 0 && (
        <View className="flex-row justify-center space-x-6 mb-3 gap-3">
          {footer.socialMedia.map((social, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openUrl(social.url)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getSocialIconName(social.platform)}
                size={18}
                color={isDark ? "#9CA3AF" : "#4B5563"}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Copyright */}
      <AutoText
        className={`text-center text-xs ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        {footer.copyright.replace('{year}', new Date().getFullYear().toString())}
      </AutoText>
    </View>
  );
}
