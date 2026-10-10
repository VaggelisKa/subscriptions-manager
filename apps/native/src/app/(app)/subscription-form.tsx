import Head from "expo-router/head";
import { useSubscriptionForm } from "@/lib/use-subscription-form";
import { SubscriptionFormView } from "@/components/form/subscription-form-view";

export default function SubscriptionFormScreen() {
  const form = useSubscriptionForm();

  return (
    <>
      <Head>
        <title>{form.isEdit ? "Edit subscription" : "New subscription"}</title>
      </Head>
      <SubscriptionFormView form={form} />
    </>
  );
}
