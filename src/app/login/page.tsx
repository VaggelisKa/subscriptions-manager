import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  async function loginWithMagicLinkAction(formData: FormData) {
    "use server";

    console.log(formData.get("email"));
  }

  return (
    <main className="absolute bottom-[50%] left-[50%] w-full -translate-x-[50%] px-6">
      <form
        action={loginWithMagicLinkAction}
        className="mx-auto flex max-w-[300px] flex-col gap-4"
      >
        <fieldset>
          <Label htmlFor="login-page-email">email</Label>
          <Input
            id="login-page-email"
            name="email"
            placeholder="your-email@some.com"
            autoFocus
          />
        </fieldset>
        <Button>Login</Button>
      </form>
    </main>
  );
}
