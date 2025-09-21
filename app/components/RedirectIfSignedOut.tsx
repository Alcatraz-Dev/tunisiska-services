import { SignedOut } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function RedirectIfSignedOut() {
  const router = useRouter();

  return (
    <SignedOut>
      <SignedOutRedirect router={router} />
    </SignedOut>
  );
}

function SignedOutRedirect({ router }:any) {
  useEffect(() => {
    router.replace("/welcome"); // redirect to home page
  }, [router]);

  return null; // render nothing while redirecting
}