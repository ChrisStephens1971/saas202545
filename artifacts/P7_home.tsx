/**
 * P7_home.tsx
 * Simple Mode Home Screen - React Native Implementation
 *
 * Four-button interface for church members:
 * - Messages
 * - Events
 * - People
 * - Give
 *
 * Elder-first design: Large text, high contrast, big tap targets
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  AccessibilityInfo,
} from 'react-native';

// Icon library - would use @expo/vector-icons or react-native-vector-icons
// For this stub, we'll use emoji placeholders
type IconName = 'messages' | 'events' | 'people' | 'give';

interface BigButtonProps {
  icon: IconName;
  label: string;
  badge?: number;
  onPress: () => void;
  testID?: string;
}

interface SimpleHomeProps {
  userName: string;
  unreadCount?: number;
  upcomingEventCount?: number;
  onNavigate: (screen: 'messages' | 'events' | 'people' | 'give') => void;
}

// Icon mapping (replace with actual icon library)
const ICON_MAP: Record<IconName, string> = {
  messages: '💬',
  events: '📅',
  people: '👥',
  give: '❤️',
};

/**
 * BigButton Component
 * Large, accessible button with icon, label, and optional badge
 */
const BigButton: React.FC<BigButtonProps> = ({
  icon,
  label,
  badge,
  onPress,
  testID,
}) => {
  // Accessibility label includes badge count
  const accessibilityLabel = badge
    ? `${label}, ${badge} ${badge === 1 ? 'item' : 'items'}`
    : label;

  return (
    <TouchableOpacity
      style={styles.bigButton}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{ICON_MAP[icon]}</Text>
        </View>
        <Text style={styles.buttonLabel}>{label}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chevron}>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * SimpleHome Component
 * Main landing screen with personalized greeting and 4 navigation buttons
 */
const SimpleHome: React.FC<SimpleHomeProps> = ({
  userName,
  unreadCount = 0,
  upcomingEventCount = 0,
  onNavigate,
}) => {
  // Get time-aware greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        {/* Personalized Greeting */}
        <View style={styles.header}>
          <Text
            style={styles.greeting}
            accessibilityRole="header"
            accessibilityLabel={`${getGreeting()}, ${userName}`}
          >
            {getGreeting()}, {userName}!
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <BigButton
            icon="messages"
            label="Messages"
            badge={unreadCount}
            onPress={() => onNavigate('messages')}
            testID="button-messages"
          />

          <BigButton
            icon="events"
            label="Events"
            badge={upcomingEventCount}
            onPress={() => onNavigate('events')}
            testID="button-events"
          />

          <BigButton
            icon="people"
            label="People"
            onPress={() => onNavigate('people')}
            testID="button-people"
          />

          <BigButton
            icon="give"
            label="Give"
            onPress={() => onNavigate('give')}
            testID="button-give"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

/**
 * Stylesheet
 * Following elder-first design principles:
 * - Large tap targets (80px height)
 * - High contrast (WCAG AA+)
 * - Scalable text (uses default text sizing)
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 36,
    // Text will scale with system font size settings
  },
  buttonContainer: {
    gap: 12, // Space between buttons
  },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: 80, // Ensures adequate tap target
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
  },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  chevron: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 28,
    color: '#9ca3af',
    fontWeight: '300',
  },
});

/**
 * Example Usage
 *
 * import { SimpleHome } from './P7_home';
 *
 * function App() {
 *   const handleNavigate = (screen) => {
 *     // Navigate to screen using React Navigation
 *     navigation.navigate(screen);
 *   };
 *
 *   return (
 *     <SimpleHome
 *       userName="John"
 *       unreadCount={2}
 *       upcomingEventCount={1}
 *       onNavigate={handleNavigate}
 *     />
 *   );
 * }
 */

export default SimpleHome;
export { BigButton };
export type { SimpleHomeProps, BigButtonProps };
