import { Component, computed, inject, signal } from "@angular/core";
import { FormField, form, minLength, required, validate } from "@angular/forms/signals";
import {
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "@ng-native/components";
import { Haptics } from "@ng-native/expo/haptics";
import { NativeHeader, NativeNavigation } from "@ng-native/router";
import { Auth } from "../data/auth.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in or create an account: a Signal Form over two native text fields. */
@Component({
  selector: "app-login",
  imports: [
    FormField,
    KeyboardAvoidingView,
    NativeHeader,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
  ],
  template: `
    <native-header [hidden]="true" />
    <keyboard-avoiding-view class="screen" behavior="padding">
      <safe-area-view class="screen" [edges]="['top', 'bottom']">
        <scroll-view
          class="screen"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <view class="page">
            <view class="mark"><text class="mark-letter">S</text></view>
            <text class="title">{{ signUp() ? "Create account" : "Welcome back" }}</text>
            <text class="subhead muted">
              {{
                signUp()
                  ? "Track every subscription and what it costs you each month."
                  : "Sign in to see your subscriptions."
              }}
            </text>

            @if (!configured) {
              <text class="error">
                Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and
                EXPO_PUBLIC_SUPABASE_ANON_KEY to apps/ng-native/.env and restart Metro.
              </text>
            }

            <view class="fields">
              <text-input
                class="field"
                placeholder="Email"
                accessibilityLabel="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                [autoCorrect]="false"
                [formField]="f.email"
              />
              <text-input
                class="field"
                placeholder="Password"
                accessibilityLabel="Password"
                [secureTextEntry]="true"
                [textContentType]="signUp() ? 'newPassword' : 'password'"
                [formField]="f.password"
                (submitEditing)="submit()"
              />
            </view>

            @if (error(); as error) {
              <text class="error" accessibilityRole="alert">{{ error }}</text>
            }

            <pressable
              class="button"
              accessibilityRole="button"
              [accessibilityState]="{ disabled: disabled() }"
              [disabled]="disabled()"
              (press)="submit()"
            >
              <text class="button-label">{{
                submitting() ? "Please wait…" : signUp() ? "Create account" : "Sign in"
              }}</text>
            </pressable>

            <pressable class="switch-mode" accessibilityRole="button" (press)="toggleMode()">
              <text class="subhead muted">{{
                signUp() ? "Already have an account? " : "New here? "
              }}<text class="link">{{ signUp() ? "Sign in" : "Create one" }}</text></text>
            </pressable>
          </view>
        </scroll-view>
      </safe-area-view>
    </keyboard-avoiding-view>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .page {
      flex-grow: 1;
      justify-content: center;
      gap: 14px;
      padding: 34px 22px 24px;
    }
    .mark {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      background-color: var(--primary);
    }
    .mark-letter {
      color: var(--primary-foreground);
      font-weight: 900;
      font-size: 34px;
    }
    .fields {
      gap: 10px;
      margin-top: 10px;
    }
    .switch-mode {
      align-items: center;
      padding: 12px;
    }
    .link {
      font-weight: 800;
      color: var(--primary-text);
    }
  `,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);

  protected readonly configured = this.auth.configured;
  protected readonly signUp = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly data = signal({ email: "", password: "" });
  protected readonly f = form(this.data, (path) => {
    required(path.email, { message: "Email is required" });
    // Trimmed first: iOS autocomplete likes to leave a trailing space, and `Auth` trims anyway.
    validate(path.email, ({ value }) =>
      EMAIL.test(value().trim())
        ? undefined
        : { kind: "email", message: "That doesn't look like an email address" },
    );
    required(path.password, { message: "Password is required" });
    minLength(path.password, 6, { message: "At least 6 characters" });
  });

  protected readonly disabled = computed(() => this.f().invalid() || this.submitting());

  protected toggleMode(): void {
    this.haptics.select();
    this.signUp.update((on) => !on);
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.disabled()) {
      // Show every field's error instead of ignoring the tap.
      this.f().markAsTouched();
      const first = this.f.email().errors()[0] ?? this.f.password().errors()[0];
      this.error.set(first?.message ?? null);
      this.haptics.notify("warning");
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.data();
    const result = this.signUp()
      ? await this.auth.signUp(email, password)
      : await this.auth.signIn(email, password);
    this.submitting.set(false);

    if (result.error) {
      this.error.set(result.error);
      this.haptics.notify("error");
      return;
    }

    this.haptics.notify("success");
    // A fresh stack: there is no login screen to go back to once signed in.
    void this.navigation.reset("/");
  }
}
