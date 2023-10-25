import { Check } from "lucide-react";

export default function LoginConfirmationPage() {
  return (
    <section className="absolute bottom-[50%] left-[50%] w-full -translate-x-[50%] px-6">
      <div className="flex flex-col items-center">
        <Check aria-hidden="true" size={48} strokeWidth={2.25} />
        <p className="text-center">
          One time password was generated. Please check your email!
        </p>
      </div>
    </section>
  );
}
