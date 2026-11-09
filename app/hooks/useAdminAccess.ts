import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";

type AdminAccess = {
  isAdmin: boolean;
  loading: boolean;
  error: boolean;
};

/** Read admin status from the Sanity user record used by the admin console. */
export function useAdminAccess(): AdminAccess {
  const { isLoaded, user } = useUser();
  const [access, setAccess] = useState<AdminAccess>({
    isAdmin: false,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    if (!isLoaded) return () => { active = false; };
    if (!user) {
      setAccess({ isAdmin: false, loading: false, error: false });
      return () => { active = false; };
    }

    const publicMetadata = user.publicMetadata as Record<string, unknown>;
    const hasClerkAdminRole =
      publicMetadata.isAdmin === true ||
      publicMetadata.role === "admin" ||
      (Array.isArray(publicMetadata.roles) && publicMetadata.roles.includes("admin"));
    if (hasClerkAdminRole) {
      setAccess({ isAdmin: true, loading: false, error: false });
      return () => { active = false; };
    }

    setAccess({ isAdmin: false, loading: true, error: false });
    import("@/sanityClient")
      .then(({ client }) =>
        client.fetch<{ isAdmin?: boolean } | null>(
          '*[_type == "users" && clerkId == $clerkId][0]{isAdmin}',
          { clerkId: user.id },
        ),
      )
      .then((record) => {
        if (active) setAccess({ isAdmin: record?.isAdmin === true, loading: false, error: false });
      })
      .catch((error) => {
        console.warn("Could not verify admin access:", error);
        if (active) setAccess({ isAdmin: false, loading: false, error: true });
      });

    return () => { active = false; };
  }, [isLoaded, user?.id]);

  return access;
}
