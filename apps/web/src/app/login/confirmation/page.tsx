import { Check } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "View email",
  description: "View email to get your one time password",
};

export default function LoginConfirmationPage() {
  return (
    <section className="grid min-h-[calc(100vh-6rem)] w-full place-items-center">
      <div className="flex flex-col items-center">
        <Check aria-hidden="true" size={48} strokeWidth={2.25} />
        <p className="text-center">
          One time password was generated. Please check your email!
        </p>
      </div>
    </section>
  );
}
