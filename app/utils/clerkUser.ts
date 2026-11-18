type ClerkUserLike = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  unsafeMetadata?: unknown;
  phoneNumbers?: Array<{ phoneNumber?: string | null }> | null;
};

export type ClerkProfileFields = {
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  imageUrl: string;
};

const toText = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Profile details edited in the personal-information screen are stored in Clerk's
 * unsafeMetadata, because this instance does not allow writing first/last name to
 * the user object (the API answers 422 form_param_unknown for first_name).
 *
 * Read metadata first and only fall back to the Clerk user, so every screen shows
 * what the user actually saved.
 */
export function getClerkProfileFields(
  user: ClerkUserLike | null | undefined,
): ClerkProfileFields {
  const metadata = (user?.unsafeMetadata ?? {}) as Record<string, unknown>;
  const googleProfile = (metadata.googleProfile ?? {}) as Record<string, unknown>;

  const firstName =
    toText(metadata.firstName) ||
    toText(googleProfile.givenName) ||
    toText(user?.firstName);
  const lastName =
    toText(metadata.lastName) ||
    toText(googleProfile.familyName) ||
    toText(user?.lastName);

  return {
    firstName,
    lastName,
    fullName:
      [firstName, lastName].filter(Boolean).join(" ") || toText(user?.fullName),
    phoneNumber:
      toText(metadata.phoneNumber) || toText(user?.phoneNumbers?.[0]?.phoneNumber),
    address: toText(metadata.address),
    city: toText(metadata.city),
    postalCode: toText(metadata.postalCode),
    country: toText(metadata.country),
    imageUrl: toText(metadata.imageUrl) || toText(user?.imageUrl),
  };
}
