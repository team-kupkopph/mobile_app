import { ShelterTier } from "../api/types";
import { SocialIdentity } from "../auth/socialAuth";

// Base document collected in the tier-1 step, threaded to the NGO step so the final
// POST /verifications (US-C1) can submit the base set + NGO papers in one request.
export type ShelterDoc = { doc_type: string; file_url: string };

export type RootStackParamList = {
  welcome: undefined;
  // A social identity rides through account-type (US-A2): the provider already asserted a
  // verified email, so the owner path needs no form and no code.
  accountType: { social?: SocialIdentity } | undefined;
  // `tier` is present only for the shelter journey; it rides through signup → otp → shelterSetup,
  // where it is written to shelter_profile (US-B1 carries it client-side, US-B2 persists it).
  signup: { accountType: "personal" | "shelter"; tier?: ShelterTier };
  otp: { email: string; mode: "signup" | "unverified"; tier?: ShelterTier };
  otpLocked: { email: string };
  signupSuccess: undefined;
  signin: undefined;
  forgotPassword: undefined;
  resetOtp: { email: string };
  resetPassword: { email: string; code: string };
  passwordChanged: undefined;
  support: undefined;
  home: { justSignedUp?: boolean } | undefined;
  homeGuest: undefined;
  adopt: undefined;
  volunteer: undefined;
  profile: undefined;
  locationPicker: undefined;
  memberUpgrade: undefined;
  memberVerify: undefined;
  memberSubmitted: undefined;
  // Shelter journey (B · tier 1, C · tier 2)
  shelterTier: { social?: SocialIdentity } | undefined;
  shelterSetup: { tier: ShelterTier };
  shelterContact: { tier: ShelterTier };
  shelterPhoneVerify: { tier: ShelterTier; phone: string };
  shelterVerify: { tier: ShelterTier };
  shelterVerifyNgo: { baseDocs: ShelterDoc[]; socialUrl: string };
  shelterDashboard: undefined;
  shelterProfile: undefined;
};
