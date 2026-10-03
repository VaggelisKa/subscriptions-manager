import { Directive, ElementRef, Renderer2, effect, inject, input } from "@angular/core";
import { processColor } from "react-native";
import type { NativeNavigation } from "@ng-native/router";

/** A bar button: an SF Symbol or a title, drawn by UIKit (Liquid Glass on iOS 26). */
export type BarButton = {
  type: "button";
  /** SF Symbol name. */
  icon?: string;
  title?: string;
  label?: string;
  /** `prominent` fills the glass with `tint` (iOS 26). */
  variant?: "plain" | "done" | "prominent";
  tint?: string;
  disabled?: boolean;
  press: () => void;
};

export type BarMenuAction = {
  type: "action";
  title: string;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
  press: () => void;
};

/** Actions shown as their own section of the menu. */
export type BarMenuSection = { type: "section"; items: BarMenuAction[] };

/** A bar button that opens a native `UIMenu`. */
export type BarMenu = {
  type: "menu";
  icon: string;
  label?: string;
  items: (BarMenuAction | BarMenuSection)[];
};

export type BarItem = BarButton | BarMenu;

/** A sheet's way out: the glass X on the left of its bar. */
export function closeItem(navigation: NativeNavigation): BarButton {
  return { type: "button", icon: "xmark", label: "Close", press: () => navigation.back() };
}

type Side = "left" | "right";
type Handlers = Map<string, () => void>;

function color(value: string | undefined) {
  return value === undefined ? undefined : processColor(value);
}

function action(item: BarMenuAction, id: string, handlers: Handlers) {
  handlers.set(id, item.press);
  return {
    type: "action",
    title: item.title,
    sfSymbolName: item.icon,
    destructive: item.destructive,
    disabled: item.disabled,
    menuId: id,
  };
}

/** The items as react-native-screens' `prepareHeaderBarButtonItems` hands them to native. */
function prepare(items: readonly BarItem[], side: Side, buttons: Handlers, actions: Handlers) {
  return items.map((item, index) => {
    if (item.type === "button") {
      const buttonId = `${index}-${side}`;
      buttons.set(buttonId, item.press);
      return {
        type: "button",
        buttonId,
        title: item.title,
        sfSymbolName: item.icon,
        accessibilityLabel: item.label,
        variant: item.variant,
        tintColor: color(item.tint),
        disabled: item.disabled,
      };
    }
    return {
      type: "menu",
      sfSymbolName: item.icon,
      accessibilityLabel: item.label,
      menu: {
        items: item.items.map((entry, i) =>
          entry.type === "section"
            ? {
                type: "submenu",
                title: "",
                displayInline: true,
                items: entry.items.map((a, j) => action(a, `${i}.${j}-${index}-${side}`, actions)),
              }
            : action(entry, `${i}-${index}-${side}`, actions),
        ),
      },
    };
  });
}

/**
 * Native bar button items on a `<native-header>`: `<native-header [rightItems]="items()">`.
 *
 * Angular Native's `<native-header-item>` only hosts custom views, which never line up with the
 * system's own buttons or get their glass. `RNSScreenStackHeaderConfig` also takes items as data
 * (`headerRightBarButtonItems`, what Expo Router's `Stack.Toolbar` uses) and reports presses by
 * id, so this sets that prop on the header element and routes the two press events back.
 */
@Directive({ selector: "native-header[leftItems], native-header[rightItems]" })
export class BarItems {
  readonly leftItems = input<readonly BarItem[]>([]);
  readonly rightItems = input<readonly BarItem[]>([]);

  // Per side, so a change on one side doesn't resend (and redraw) the other.
  private readonly handlers = {
    left: { buttons: new Map() as Handlers, actions: new Map() as Handlers },
    right: { buttons: new Map() as Handlers, actions: new Map() as Handlers },
  };

  constructor() {
    const header = inject(ElementRef).nativeElement;
    const renderer = inject(Renderer2);

    const side = (name: Side, prop: string, items: () => readonly BarItem[]) =>
      effect(() => {
        const buttons: Handlers = new Map();
        const actions: Handlers = new Map();
        renderer.setProperty(header, prop, prepare(items(), name, buttons, actions));
        this.handlers[name] = { buttons, actions };
      });
    side("left", "headerLeftBarButtonItems", this.leftItems);
    side("right", "headerRightBarButtonItems", this.rightItems);

    // Ids end in their side ("0-left", "1.0-0-right"), so either side's map can answer.
    const find = (kind: "buttons" | "actions", id: string | undefined) =>
      id === undefined
        ? undefined
        : (this.handlers.left[kind].get(id) ?? this.handlers.right[kind].get(id));
    renderer.listen(header, "pressHeaderBarButtonItem", (event) => {
      find("buttons", event?.nativeEvent?.buttonId)?.();
    });
    renderer.listen(header, "pressHeaderBarButtonMenuItem", (event) => {
      find("actions", event?.nativeEvent?.menuId)?.();
    });
  }
}
