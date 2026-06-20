import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout";

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#09090b",
            borderRadius: "1rem"
          },
          elements: {
            cardBox: "w-full shadow-none",
            card: "bg-transparent shadow-none border-0 p-0",
            header: "hidden",
            socialButtonsBlockButton:
              "border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
            formButtonPrimary:
              "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-none",
            footerActionLink: "text-emerald-300 hover:text-emerald-200",
            formFieldInput:
              "border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-emerald-400"
          }
        }}
      />
    </AuthShell>
  );
}
