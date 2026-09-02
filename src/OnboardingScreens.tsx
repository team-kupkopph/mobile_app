import { useRef, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TextInputProps,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle
} from "react-native";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type Step = 0 | 1 | 2;

type ScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

type AccountTypeScreenProps = ScreenProps & {
  onShelterNext?: () => void;
};

type SignupScreenProps = ScreenProps & {
  onGoogleSignup?: () => void;
  onLogin?: () => void;
};

const steps: Step[] = [0, 1, 2];

export function SignupScreen({ onBack, onNext, onGoogleSignup, onLogin }: SignupScreenProps) {
  const [fullName, setFullName] = useState("Ana Reyes");
  const [mobileNumber, setMobileNumber] = useState("917 123 4567");
  const [email, setEmail] = useState("ana@email.com");
  const [password, setPassword] = useState("kupkopph");
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <Header title="Create account" activeStep={0} onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.title}>Let's get you set up</Text>
        <Text style={styles.caption}>A few details and you're in.</Text>

        <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <PhoneField value={mobileNumber} onChangeText={setMobileNumber} />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((isVisible) => !isVisible)}
        />

        <Text style={styles.helper}>We'll text a 6-digit code to verify your number.</Text>

        <PrimaryButton label="Send code" onPress={onNext} style={styles.signupPrimary} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onGoogleSignup} style={styles.googleButton}>
          <Text style={styles.googleText}>Sign up with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.75} onPress={onLogin ?? onBack}>
          <Text style={styles.linkCentered}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function OtpScreen({ onBack, onNext }: ScreenProps) {
  const [digits, setDigits] = useState(["4", "2", "1", "", "", ""]);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const updateDigit = (text: string, index: number) => {
    const nextDigit = text.replace(/\D/g, "").slice(-1);
    setDigits((currentDigits) => {
      const nextDigits = [...currentDigits];
      nextDigits[index] = nextDigit;
      return nextDigits;
    });

    if (nextDigit && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Verify your number" activeStep={1} onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We sent a 6-digit code to</Text>
        <Text style={styles.phoneText}>+63 917 123 4567</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => {
                inputRefs.current[index] = input;
              }}
              value={digit}
              onChangeText={(text) => updateDigit(text, index)}
              onKeyPress={(event) => handleOtpKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[styles.otpBox, styles.otpDigit, index === 3 && styles.otpActive]}
              textAlign="center"
            />
          ))}
        </View>

        <Text style={styles.otpHint}>Didn't get a code?</Text>
        <Text style={styles.otpMuted}>Resend in 0:59</Text>

        <PrimaryButton label="Verify" onPress={onNext} style={styles.otpPrimary} />
        <TouchableOpacity activeOpacity={0.75} onPress={onBack}>
          <Text style={styles.changeNumber}>Wrong number? Change it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function AccountTypeScreen({ onBack, onNext, onShelterNext }: AccountTypeScreenProps) {
  const [selectedType, setSelectedType] = useState<"petOwner" | "shelter">("petOwner");

  return (
    <View style={styles.screen}>
      <Header title="Choose account type" activeStep={2} onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.title}>How will you join?</Text>
        <Text style={styles.caption}>Pet owners can become rescuers later.</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedType("petOwner")}
          style={[styles.accountCard, styles.firstAccountCard, selectedType === "petOwner" && styles.accountSelected]}
        >
          <View style={[styles.accountIcon, selectedType !== "petOwner" && styles.inactiveAccountIcon]}>
            <Image source={paw} resizeMode="contain" style={styles.accountPaw} />
          </View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountTitle}>Pet Owner</Text>
            <Text style={styles.accountBody}>Adopt, care for, and love your pets.{"\n"}Become a rescuer anytime.</Text>
          </View>
          {selectedType === "petOwner" && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedType("shelter")}
          style={[styles.accountCard, selectedType === "shelter" && styles.accountSelected]}
        >
          <View style={[styles.accountIcon, styles.orgIcon, selectedType === "shelter" && styles.activeOrgIcon]}>
            <Text style={styles.orgGlyph}>▦</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountTitle}>Shelter / Organization</Text>
            <Text style={styles.accountBody}>List animals for adoption and{"\n"}receive donations.</Text>
          </View>
          {selectedType === "shelter" && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <PrimaryButton label="Continue" onPress={selectedType === "shelter" ? onShelterNext ?? onNext : onNext} style={styles.accountPrimary} />
      </View>
    </View>
  );
}

function Header({ title, activeStep, onBack }: { title: string; activeStep: Step; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusBattery}>
        <View style={styles.statusBatteryDot} />
        <View style={styles.statusBatteryDot} />
      </View>

      <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>

      <View style={styles.steps}>
        {steps.map((step) => (
          <View key={step} style={[styles.stepDot, step <= activeStep && styles.stepActive]} />
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  onToggleSecure,
  autoCapitalize,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  onToggleSecure?: () => void;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.input}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={[styles.inputText, styles.textInput]}
        />
        {onToggleSecure && (
          <TouchableOpacity activeOpacity={0.7} onPress={onToggleSecure} style={styles.eyeButton}>
            <View style={styles.eyeIcon}>
              <View style={styles.eyePupil} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PhoneField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Mobile number</Text>
      <View style={styles.phoneInput}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>+63</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          style={[styles.inputText, styles.phoneTextInput]}
        />
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  style
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.primaryButton, style]}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 132,
    paddingHorizontal: 28
  },
  statusTime: {
    position: "absolute",
    left: 30,
    top: 16,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  statusBattery: {
    position: "absolute",
    right: 22,
    top: 17,
    width: 28,
    height: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4
  },
  statusBatteryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 52,
    width: 42,
    height: 42,
    zIndex: 10,
    justifyContent: "center"
  },
  backText: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 34
  },
  headerTitle: {
    marginTop: 58,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  steps: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "center",
    gap: 22
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#D5DDDA"
  },
  stepActive: {
    backgroundColor: colors.teal
  },
  content: {
    flex: 1,
    paddingHorizontal: 28
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 29
  },
  caption: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20
  },
  phoneText: {
    marginTop: 3,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  fieldGroup: {
    marginTop: 17
  },
  label: {
    marginBottom: 8,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  input: {
    height: 43,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  inputText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  textInput: {
    flex: 1,
    height: "100%",
    padding: 0,
    paddingRight: 34
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    width: 32,
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  eyeIcon: {
    width: 20,
    height: 13,
    borderWidth: 2,
    borderColor: "#77756F",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleY: 0.82 }]
  },
  eyePupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#77756F"
  },
  phoneInput: {
    height: 43,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#FFFFFF"
  },
  countryCode: {
    width: 58,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4F2F1"
  },
  countryCodeText: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: "800"
  },
  phoneTextInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    paddingVertical: 0
  },
  helper: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17
  },
  signupPrimary: {
    marginTop: 34
  },
  primaryButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.teal
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  dividerRow: {
    marginTop: 22,
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E5DE"
  },
  orText: {
    color: colors.muted,
    fontSize: 12
  },
  googleButton: {
    height: 43,
    marginTop: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 23,
    backgroundColor: "#FFFFFF"
  },
  googleText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  linkCentered: {
    marginTop: 19,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  otpRow: {
    marginTop: 37,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  otpBox: {
    width: 44,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 0,
    backgroundColor: "#FFFFFF"
  },
  otpActive: {
    borderColor: colors.teal
  },
  otpDigit: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  otpHint: {
    marginTop: 29,
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  otpMuted: {
    marginTop: 8,
    color: "#B6B0A7",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  otpPrimary: {
    marginTop: 51
  },
  changeNumber: {
    marginTop: 27,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  accountCard: {
    minHeight: 132,
    marginTop: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 17,
    backgroundColor: "#FFFFFF"
  },
  firstAccountCard: {
    marginTop: 35,
  },
  accountSelected: {
    borderColor: colors.teal,
    backgroundColor: "#E7F2F1"
  },
  accountIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 33,
    backgroundColor: colors.teal
  },
  accountPaw: {
    width: 32,
    height: 32
  },
  inactiveAccountIcon: {
    backgroundColor: "#AFC7C3"
  },
  orgIcon: {
    backgroundColor: "#E6F0EE"
  },
  activeOrgIcon: {
    backgroundColor: "#D5E9E7"
  },
  orgGlyph: {
    color: colors.teal,
    fontSize: 32,
    fontWeight: "900"
  },
  accountCopy: {
    flex: 1,
    marginLeft: 20
  },
  accountTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  accountBody: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  checkCircle: {
    position: "absolute",
    right: 15,
    top: 13,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.teal
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18
  },
  accountPrimary: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 188
  }
});
