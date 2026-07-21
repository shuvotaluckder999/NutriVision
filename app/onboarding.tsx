import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Activity01Icon,
  AnalyticsDownIcon,
  AnalyticsUpIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BirthdayCakeIcon,
  BodyWeightIcon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Dumbbell01Icon,
  RulerIcon,
  Target01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
} from 'hugeicons-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { OnboardingStorage, UserOnboardingData } from '../utils/onboardingStorage';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const YEARS = Array.from({ length: 70 }, (_, i) => String(2015 - i));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

export default function OnboardingScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('male');
  const [goal, setGoal] = useState<'gain' | 'lose' | 'maintain' | ''>('maintain');
  const [workoutDays, setWorkoutDays] = useState<'2-3 days' | '3-7 Days' | '7-15 Days' | '1 month' | ''>('3-7 Days');
  
  // Birthdate
  const [day, setDay] = useState('15');
  const [month, setMonth] = useState('06');
  const [year, setYear] = useState('1998');

  // Height & Weight
  const [feet, setFeet] = useState('5');
  const [inches, setInches] = useState('9');
  const [weightKg, setWeightKg] = useState('68');

  const totalSteps = 6;
  const progressPercent = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'User authentication session not found.');
      return;
    }

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const payload: Partial<UserOnboardingData> = {
        gender,
        goal,
        workoutDays,
        birthdate: { day, month, year },
        height: { feet, inches },
        weight: { kg: weightKg },
      };

      await OnboardingStorage.saveOnboardingData(user.id, payload);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
      Alert.alert('Error', 'Could not save profile settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F17" />
      
      {/* Top Header & Animated Progress Bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {currentStep > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <ArrowLeft01Icon color="#FFFFFF" size={24} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {currentStep} of {totalSteps}</Text>
          </View>

          <View style={styles.backPlaceholder} />
        </View>

        {/* Progress Bar Container */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Dynamic Step Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={`step-${currentStep}`}
          entering={FadeInRight.duration(300)}
          exiting={FadeOutLeft.duration(200)}
          style={styles.animatedStepContainer}
        >
          {/* STEP 1: SELECT GENDER */}
          {currentStep === 1 && (
            <View style={styles.stepBox}>
              <Text style={styles.title}>Select Gender</Text>
              <Text style={styles.subtitle}>
                We use gender to accurately calculate daily calorie needs and basal metabolic rate (BMR).
              </Text>

              <View style={styles.optionsStack}>
                {/* Male */}
                <TouchableOpacity
                  style={[styles.cardOption, gender === 'male' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender('male');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, gender === 'male' && styles.iconContainerSelected]}>
                    <UserIcon size={28} color={gender === 'male' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, gender === 'male' && styles.optionTitleSelected]}>Male</Text>
                    <Text style={styles.optionDescription}>Optimized metrics for male physiology</Text>
                  </View>
                  {gender === 'male' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Female */}
                <TouchableOpacity
                  style={[styles.cardOption, gender === 'female' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender('female');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, gender === 'female' && styles.iconContainerSelected]}>
                    <UserCheck01Icon size={28} color={gender === 'female' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, gender === 'female' && styles.optionTitleSelected]}>Female</Text>
                    <Text style={styles.optionDescription}>Optimized metrics for female physiology</Text>
                  </View>
                  {gender === 'female' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Other */}
                <TouchableOpacity
                  style={[styles.cardOption, gender === 'other' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender('other');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, gender === 'other' && styles.iconContainerSelected]}>
                    <UserGroupIcon size={28} color={gender === 'other' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, gender === 'other' && styles.optionTitleSelected]}>Other / Non-binary</Text>
                    <Text style={styles.optionDescription}>Custom metabolic baseline model</Text>
                  </View>
                  {gender === 'other' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: WHAT'S THE GOAL */}
          {currentStep === 2 && (
            <View style={styles.stepBox}>
              <Text style={styles.title}>What's your goal?</Text>
              <Text style={styles.subtitle}>
                Choose your primary objective to customize your daily target macros.
              </Text>

              <View style={styles.optionsStack}>
                {/* Gain Weight */}
                <TouchableOpacity
                  style={[styles.cardOption, goal === 'gain' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal('gain');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, goal === 'gain' && styles.iconContainerSelected]}>
                    <AnalyticsUpIcon size={28} color={goal === 'gain' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, goal === 'gain' && styles.optionTitleSelected]}>Gain Weight</Text>
                    <Text style={styles.optionDescription}>Build muscle & clean caloric surplus</Text>
                  </View>
                  {goal === 'gain' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Lose Weight */}
                <TouchableOpacity
                  style={[styles.cardOption, goal === 'lose' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal('lose');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, goal === 'lose' && styles.iconContainerSelected]}>
                    <AnalyticsDownIcon size={28} color={goal === 'lose' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, goal === 'lose' && styles.optionTitleSelected]}>Lose Weight</Text>
                    <Text style={styles.optionDescription}>Burn body fat with controlled deficit</Text>
                  </View>
                  {goal === 'lose' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Maintain */}
                <TouchableOpacity
                  style={[styles.cardOption, goal === 'maintain' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal('maintain');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, goal === 'maintain' && styles.iconContainerSelected]}>
                    <Target01Icon size={28} color={goal === 'maintain' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, goal === 'maintain' && styles.optionTitleSelected]}>Maintain</Text>
                    <Text style={styles.optionDescription}>Sustain current body weight & health</Text>
                  </View>
                  {goal === 'maintain' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: WORKOUT DETAILS */}
          {currentStep === 3 && (
            <View style={styles.stepBox}>
              <Text style={styles.title}>Workout Details</Text>
              <Text style={styles.subtitle}>
                How often do you engage in physical activity or structured workouts?
              </Text>

              <View style={styles.optionsStack}>
                {/* 2-3 days */}
                <TouchableOpacity
                  style={[styles.cardOption, workoutDays === '2-3 days' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWorkoutDays('2-3 days');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, workoutDays === '2-3 days' && styles.iconContainerSelected]}>
                    <Calendar01Icon size={26} color={workoutDays === '2-3 days' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, workoutDays === '2-3 days' && styles.optionTitleSelected]}>2-3 days</Text>
                    <Text style={styles.optionDescription}>Light activity / beginner routine</Text>
                  </View>
                  {workoutDays === '2-3 days' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* 3-7 Days */}
                <TouchableOpacity
                  style={[styles.cardOption, workoutDays === '3-7 Days' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWorkoutDays('3-7 Days');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, workoutDays === '3-7 Days' && styles.iconContainerSelected]}>
                    <Dumbbell01Icon size={26} color={workoutDays === '3-7 Days' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, workoutDays === '3-7 Days' && styles.optionTitleSelected]}>3-7 Days</Text>
                    <Text style={styles.optionDescription}>Moderate exercise / weekly regular</Text>
                  </View>
                  {workoutDays === '3-7 Days' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* 7-15 Days */}
                <TouchableOpacity
                  style={[styles.cardOption, workoutDays === '7-15 Days' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWorkoutDays('7-15 Days');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, workoutDays === '7-15 Days' && styles.iconContainerSelected]}>
                    <Activity01Icon size={26} color={workoutDays === '7-15 Days' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, workoutDays === '7-15 Days' && styles.optionTitleSelected]}>7-15 Days</Text>
                    <Text style={styles.optionDescription}>Active athlete / multi-session focus</Text>
                  </View>
                  {workoutDays === '7-15 Days' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>

                {/* 1 month */}
                <TouchableOpacity
                  style={[styles.cardOption, workoutDays === '1 month' && styles.cardOptionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWorkoutDays('1 month');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconContainer, workoutDays === '1 month' && styles.iconContainerSelected]}>
                    <Clock01Icon size={26} color={workoutDays === '1 month' ? Colors.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, workoutDays === '1 month' && styles.optionTitleSelected]}>1 month</Text>
                    <Text style={styles.optionDescription}>Daily training & constant streak</Text>
                  </View>
                  {workoutDays === '1 month' && <CheckmarkCircle01Icon size={24} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4 & 5: BIRTHDATE & DATE/MONTH/YEAR PICKER */}
          {(currentStep === 4 || currentStep === 5) && (
            <View style={styles.stepBox}>
              <Text style={styles.title}>{currentStep === 4 ? 'When were you born?' : 'Confirm Birthdate Details'}</Text>
              <Text style={styles.subtitle}>
                Select your Date, Month & Year to help us calculate age-adjusted caloric targets.
              </Text>

              {/* Date Card Preview */}
              <View style={styles.datePreviewBox}>
                <BirthdayCakeIcon size={32} color={Colors.primary} />
                <Text style={styles.datePreviewText}>
                  {MONTHS[parseInt(month, 10) - 1] || 'Jan'} {day}, {year}
                </Text>
              </View>

              {/* Selectors Grid */}
              <Text style={styles.sectionHeading}>Date of Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={`day-${d}`}
                    style={[styles.chip, day === d && styles.chipSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDay(d);
                    }}
                  >
                    <Text style={[styles.chipText, day === d && styles.chipTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionHeading}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
                {MONTHS.map((m, index) => {
                  const mVal = String(index + 1).padStart(2, '0');
                  const isSelected = month === mVal;
                  return (
                    <TouchableOpacity
                      key={`month-${m}`}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setMonth(mVal);
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionHeading}>Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={`year-${y}`}
                    style={[styles.chip, year === y && styles.chipSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setYear(y);
                    }}
                  >
                    <Text style={[styles.chipText, year === y && styles.chipTextSelected]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* STEP 6: HEIGHT (FEET & INCH) AND WEIGHT (KG) */}
          {currentStep === 6 && (
            <View style={styles.stepBox}>
              <Text style={styles.title}>Height & Weight</Text>
              <Text style={styles.subtitle}>
                Specify your height in Feet & Inches, and weight in Kilograms (Kg).
              </Text>

              {/* Height Container */}
              <View style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <RulerIcon size={24} color={Colors.primary} />
                  <Text style={styles.measurementTitle}>Height</Text>
                  <Text style={styles.measurementValue}>{feet} ft {inches} in</Text>
                </View>

                {/* Feet Picker */}
                <Text style={styles.subHeading}>Feet (ft)</Text>
                <View style={styles.pillRow}>
                  {['3', '4', '5', '6', '7'].map((f) => (
                    <TouchableOpacity
                      key={`ft-${f}`}
                      style={[styles.smallPill, feet === f && styles.smallPillSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setFeet(f);
                      }}
                    >
                      <Text style={[styles.smallPillText, feet === f && styles.smallPillTextSelected]}>{f} ft</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Inches Picker */}
                <Text style={styles.subHeading}>Inches (in)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
                  {Array.from({ length: 12 }, (_, i) => String(i)).map((inc) => (
                    <TouchableOpacity
                      key={`inc-${inc}`}
                      style={[styles.chip, inches === inc && styles.chipSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setInches(inc);
                      }}
                    >
                      <Text style={[styles.chipText, inches === inc && styles.chipTextSelected]}>{inc} in</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Weight Container */}
              <View style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <BodyWeightIcon size={24} color={Colors.primary} />
                  <Text style={styles.measurementTitle}>Weight</Text>
                  <Text style={styles.measurementValue}>{weightKg} kg</Text>
                </View>

                <Text style={styles.subHeading}>Weight in Kilograms (Kg)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
                  {Array.from({ length: 120 }, (_, i) => String(35 + i)).map((w) => (
                    <TouchableOpacity
                      key={`weight-${w}`}
                      style={[styles.chip, weightKg === w && styles.chipSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setWeightKg(w);
                      }}
                    >
                      <Text style={[styles.chipText, weightKg === w && styles.chipTextSelected]}>{w} kg</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {currentStep === totalSteps ? 'Complete Profile' : 'Continue'}
              </Text>
              <ArrowRight01Icon color="#FFFFFF" size={20} style={styles.continueIcon} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 15,
    paddingBottom: 15,
    backgroundColor: '#0C0F17',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#161F30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  stepBadge: {
    backgroundColor: Colors.primary10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary30,
  },
  stepBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  animatedStepContainer: {
    flex: 1,
    marginTop: 10,
  },
  stepBox: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  optionsStack: {
    gap: 14,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  cardOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(81, 130, 216, 0.08)',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1C253B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: Colors.primary10,
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  datePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary30,
    marginBottom: 20,
  },
  datePreviewText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 16,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 10,
  },
  horizontalSelector: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  measurementCard: {
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginBottom: 18,
  },
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  measurementTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  measurementValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  subHeading: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smallPill: {
    flex: 1,
    backgroundColor: '#1C253B',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  smallPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  smallPillText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  smallPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0C0F17',
    borderTopWidth: 1,
    borderTopColor: '#161F30',
  },
  continueButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  continueIcon: {
    marginLeft: 8,
  },
});
