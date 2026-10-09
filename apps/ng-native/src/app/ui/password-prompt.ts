import { Component, computed, input, linkedSignal, output, signal } from "@angular/core";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "@ng-native/components";

/**
 * A centered password dialog for re-authentication. `Dialogs.ask` is iOS-only and has no secure
 * entry, so this is a transparent `<modal>` that looks the same on iOS and Android. Put it in an
 * `@if` to show it; the parent owns `busy` and `error` and answers `(confirm)` and `(cancel)`. The
 * parent must set `busy` synchronously in its `(confirm)` handler.
 */
@Component({
  selector: "app-password-prompt",
  imports: [KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View],
  template: `
    <modal
      [transparent]="true"
      animationType="fade"
      [statusBarTranslucent]="true"
      [navigationBarTranslucent]="true"
      (requestClose)="dismiss()"
    >
      <keyboard-avoiding-view class="backdrop" behavior="padding">
        <pressable class="scrim" [accessible]="false" (press)="dismiss()" />
        <view class="card" [accessibilityViewIsModal]="true">
          <view class="heading">
            <text class="prompt-title" accessibilityRole="header">{{ title() }}</text>
            <text class="body muted">{{ message() }}</text>
          </view>
          <view class="heading">
            <text-input
              class="field"
              placeholder="Password"
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              [secureTextEntry]="true"
              [autoCorrect]="false"
              [autoFocus]="true"
              [editable]="!busy()"
              [(value)]="password"
              (submitEditing)="submit()"
            />
            @if (error(); as error) {
              <text class="error" accessibilityRole="alert">{{ error }}</text>
            }
          </view>
          <view class="actions">
            <pressable
              class="button destructive"
              accessibilityRole="button"
              [accessibilityLabel]="confirmLabel()"
              [accessibilityState]="{ disabled: disabled(), busy: busy() }"
              [disabled]="disabled()"
              (press)="submit()"
            >
              <text class="button-label">{{ busy() ? "Please wait…" : confirmLabel() }}</text>
            </pressable>
            <pressable
              class="cancel"
              accessibilityRole="button"
              [accessibilityState]="{ disabled: locked() }"
              [disabled]="locked()"
              (press)="dismiss()"
            >
              <text class="cancel-label">Cancel</text>
            </pressable>
          </view>
        </view>
      </keyboard-avoiding-view>
    </modal>
  `,
  styles: `
    .backdrop {
      flex: 1;
      justify-content: center;
      padding: 24px;
    }
    .scrim {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: rgba(0, 0, 0, 0.45);
    }
    .card {
      width: 100%;
      max-width: 420px;
      align-self: center;
      gap: 16px;
      padding: 24px;
      border-radius: 34px;
      background-color: var(--background);
    }
    .heading {
      gap: 8px;
    }
    .prompt-title {
      font-weight: 800;
      font-size: 22px;
      line-height: 28px;
      letter-spacing: -0.3px;
    }
    .actions {
      gap: 4px;
    }
    .destructive {
      background-color: var(--destructive);
    }
    .cancel {
      align-items: center;
      justify-content: center;
      min-height: 52px;
    }
    .cancel[data-disabled] {
      opacity: 0.5;
    }
    .cancel-label {
      font-weight: 700;
      font-size: 16px;
      color: var(--primary-text);
    }
  `,
})
export class PasswordPrompt {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  /** Checking the password, or the work that follows it. */
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirm = output<string>();
  readonly cancel = output<void>();

  protected readonly password = signal("");
  /**
   * Set on submit, so a double tap can't confirm twice. Cleared whenever `busy` changes: the parent
   * has taken the attempt over (busy) or finished it (not busy). `error` doesn't clear it, since the
   * same message may come back twice or be cleared while an attempt is still running.
   */
  private readonly submitted = linkedSignal({ source: this.busy, computation: () => false });
  /** A password is on its way: the parent may already be continuing with it. */
  protected readonly locked = computed(() => this.busy() || this.submitted());
  protected readonly disabled = computed(() => !this.password() || this.locked());

  protected submit(): void {
    if (this.disabled()) return;
    this.submitted.set(true);
    this.confirm.emit(this.password());
  }

  protected dismiss(): void {
    if (!this.locked()) this.cancel.emit();
  }
}
