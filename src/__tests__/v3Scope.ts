// Task A0.2 · the shared V3 scope list.
//
// Spec §4.2 names the shelter-rescuer V3 conversion surface by category. Its own table
// sums to 34 (2 + 3 + 4 + 1 + 9 + 3 + 12), not the 35 the plan narrates — the parenthetical
// "RescueMapScreen chrome only" bracket in the Sagip section does not add a 13th screen, it
// just calls out that RescueMapScreen (already counted once, in the list of 12 Sagip names)
// is in scope for its chrome, not a separate screen. `RootNavigator.tsx` registers exactly
// 12 distinct Sagip rescuer screen names — MyRescuesScreen, MyOffersScreen, RescueMapScreen,
// RescueListScreen, RescueListedScreen, RescueOfferScreen, RescueOfferSentScreen,
// RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, RescueUpdateScreen,
// PlaceAcceptedScreen — confirming 12, not 13. A screen cannot be invented to make the plan's
// count match; V3_SCOPE below ships with the true, empirically-verified count: 34.
//
// V3_EXCLUDED lists, by name, every one of the other 56 screens in `src/screens/` — the 6
// shelter-onboarding screens (spec §3), the 7 owner V3 screens (already converted in
// Sprint 11), the 7 KawangGawa owner-side volunteer screens, and every remaining owner
// screen — so `V3_SCOPE ∪ V3_EXCLUDED` accounts for the entire file list and nothing is
// silently forgotten (asserted in v3Scope.test.ts).

/** Shell roots (5) — Task B1 added ShelterDonateScreen, the Donate tab's new root, born
 * converted (spec §5); Task B2 added ShelterAnimalsScreen, the Animals tab's new root, the
 * same way; Task B3 adds ShelterRequestsScreen, the Requests tab's new root — the last of
 * ShelterTabs' five tabs to stop being dead — none of the three is a re-derived count like
 * the rest of this file, all three are ADDITIONS. */
const SHELL_ROOTS = [
  "ShelterDashboardScreen",
  "ShelterProfileScreen",
  "ShelterDonateScreen",
  "ShelterAnimalsScreen",
  "ShelterRequestsScreen"
] as const;

/** Shelter listings (3) */
const SHELTER_LISTINGS = ["ListingFormScreen", "ListingDetailScreen", "PlaceRequestScreen"] as const;

/** Shelter donations (4) */
const SHELTER_DONATIONS = ["DonationQrScreen", "DonateScreen", "DonatePledgeScreen", "MyDonationsScreen"] as const;

/** Shelter needs (1) */
const SHELTER_NEEDS = ["ShelterNeedsScreen"] as const;

/** Shelter volunteer (9) */
const SHELTER_VOLUNTEER = [
  "ShelterVolunteerScreen",
  "ShelterVolunteerCreateScreen",
  "ShelterVolunteerEditScreen",
  "ShelterVolunteerDetailScreen",
  "ShelterVolunteerRequestsScreen",
  "ShelterVolunteerAttendanceScreen",
  "ShelterVolunteerCalendarScreen",
  "ShelterVolunteerActivityScreen",
  "ShelterVolunteerCancelScreen"
] as const;

/** Verified Member (3) */
const VERIFIED_MEMBER = ["MemberUpgradeScreen", "MemberVerifyScreen", "MemberSubmittedScreen"] as const;

/**
 * Sagip rescuer (12 — RootNavigator.tsx-verified, not the plan's 13; see file header).
 * RescueMapScreen is counted once here, covering both the map screen itself and its chrome.
 */
const SAGIP_RESCUER = [
  "MyRescuesScreen",
  "MyOffersScreen",
  "RescueMapScreen",
  "RescueListScreen",
  "RescueListedScreen",
  "RescueOfferScreen",
  "RescueOfferSentScreen",
  "RescuePlaceScreen",
  "RescuePlaceConfirmScreen",
  "RescuePlaceSentScreen",
  "RescueUpdateScreen",
  "PlaceAcceptedScreen"
] as const;

export const V3_SCOPE: readonly string[] = [
  ...SHELL_ROOTS,
  ...SHELTER_LISTINGS,
  ...SHELTER_DONATIONS,
  ...SHELTER_NEEDS,
  ...SHELTER_VOLUNTEER,
  ...VERIFIED_MEMBER,
  ...SAGIP_RESCUER
];

/** 6 shelter-onboarding screens (spec §3) */
const SHELTER_ONBOARDING = [
  "ShelterTierScreen",
  "ShelterSetupScreen",
  "ShelterContactScreen",
  "ShelterPhoneVerifyScreen",
  "ShelterVerifyScreen",
  "ShelterVerifyNgoScreen"
] as const;

/** 7 owner V3 screens (already converted in Sprint 11) */
const OWNER_V3 = [
  "HomeScreen",
  "HomeGuestScreen",
  "AdoptScreen",
  "InquiryScreen",
  "MyInquiriesScreen",
  "ProfileScreen",
  "SigninScreen"
] as const;

/** 5 KawangGawa owner-side volunteer screens. Was 7 — Task 5 (K30/G9) folded the standalone
 * KawangGawaScheduleScreen and KawangGawaHistoryScreen into the hub itself (one screen,
 * segmented Browse | My shifts), and both files were deleted. */
const KAWANG_GAWA = [
  "KawangGawaScreen",
  "KawangGawaCancelScreen",
  "KawangGawaCheckinScreen",
  "KawangGawaDetailScreen",
  "KawangGawaRequestedScreen"
] as const;

/** Every other owner screen (auth, onboarding, reports, settings, stories, etc.) — 36 names */
const OTHER_OWNER_SCREENS = [
  "AccountTypeScreen",
  "AdjustPinScreen",
  "AuthFormKit",
  "BadgeComparisonScreen",
  "DeleteAccountScreen",
  "ExportDataScreen",
  "ForgotPasswordScreen",
  "ImpactScreen",
  "LocationPickerScreen",
  "MatchDetailScreen",
  "MyPetsScreen",
  "MyReportsScreen",
  "NeedFormScreen",
  "NeedPledgesScreen",
  "NotificationsScreen",
  "OtpLockedScreen",
  "OtpScreen",
  "PasswordChangedScreen",
  "ReportContentScreen",
  "ReportDetailScreen",
  "ReportMatchesScreen",
  "ReportSentScreen",
  "ReportStrayScreen",
  "ResetOtpScreen",
  "ResetPasswordScreen",
  "SettingsPrivacyScreen",
  "SettingsScreen",
  "SignupScreen",
  "SignupSuccessScreen",
  "StoriesScreen",
  "StoryComposeScreen",
  "StoryDetailScreen",
  "VerifyDocumentsScreen",
  "VerifyPhoneScreen",
  "VerifyResubmitScreen",
  "WaiverScreen"
] as const;

export const V3_EXCLUDED: readonly string[] = [
  ...SHELTER_ONBOARDING,
  ...OWNER_V3,
  ...KAWANG_GAWA,
  ...OTHER_OWNER_SCREENS
];
