import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useOAuth } from '@clerk/expo';
import { useSignUp } from '@clerk/expo/legacy';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LocalStorage } from '../../utils/storage';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification states
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);

  // Input focus states for UI styling
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Process SignUp form submission
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!fullName || !email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Basic password validation
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Split name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      // Start the signup process
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      // Prepare email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      // Set to true to show the OTP screen
      setPendingVerification(true);
    } catch (err: any) {
      console.error(err);
      const message = err.errors?.[0]?.longMessage || 'Registration failed. Please check your inputs.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the OTP code
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    if (!verificationCode) {
      setErrorMessage('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === 'complete') {
        await LocalStorage.setItem('user_signed_in', 'true');
        await setActive({ session: completeSignUp.createdSessionId });
      } else {
        console.warn('SignUp status incomplete:', completeSignUp.status);
        setErrorMessage('Verification incomplete. Please retry.');
      }
    } catch (err: any) {
      console.error(err);
      const message = err.errors?.[0]?.longMessage || 'Invalid verification code. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth
  const onGoogleSignUpPress = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/', { scheme: 'nutrivision' }),
      });

      if (createdSessionId && setOAuthActive) {
        await LocalStorage.setItem('user_signed_in', 'true');
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error(err);
      const message = err.errors?.[0]?.longMessage || 'Google signup failed';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.logoOuterCircle}>
            <View style={styles.logoInnerCircle}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.appName}>NutriVision</Text>
          <Text style={styles.appSubtitle}>AI Calories Calculator</Text>
          <Text style={styles.welcomeText}>
            {pendingVerification ? 'Verify Email' : 'Create Account'}
          </Text>
          <Text style={styles.welcomeSubtext}>
            {pendingVerification
              ? `We sent a 6-digit code to\n${email}`
              : 'Join us to get AI nutrition insights'}
          </Text>
        </View>

        {/* Form Fields Card */}
        <View style={styles.formContainer}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {!pendingVerification ? (
            // REGISTRATION FORM
            <>
              {/* Full Name Input */}
              <View
                style={[
                  styles.inputWrapper,
                  nameFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={nameFocused ? '#10B981' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>

              {/* Email Input */}
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? '#10B981' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordFocused ? '#10B981' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password (Min. 8 chars)"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={passwordFocused ? '#10B981' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpButton, isLoading && styles.disabledButton]}
                onPress={onSignUpPress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google SSO Button */}
              <TouchableOpacity
                style={[styles.socialButton, isLoading && styles.disabledButton]}
                onPress={onGoogleSignUpPress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.socialContent}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Google / Gmail</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            // OTP VERIFICATION VIEW
            <>
              {/* OTP Input */}
              <View
                style={[
                  styles.inputWrapper,
                  otpFocused && styles.inputWrapperFocused,
                  styles.otpInputWrapper,
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={otpFocused ? '#10B981' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="------"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                />
              </View>

              {/* Submit Code Button */}
              <TouchableOpacity
                style={[styles.signUpButton, isLoading && styles.disabledButton]}
                onPress={onVerifyPress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signUpButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              {/* Go Back button (reset verification state) */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPendingVerification(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>Back to Sign Up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/sign-in' as any)} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17', // Dark obsidian theme
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoOuterCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  logoInnerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logo: {
    width: 44,
    height: 44,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#121824', // Curved slate card
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0F17',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputWrapperFocused: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  signUpButton: {
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 13,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  socialButton: {
    backgroundColor: '#0C0F17',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  otpInputWrapper: {
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footerLink: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
});
