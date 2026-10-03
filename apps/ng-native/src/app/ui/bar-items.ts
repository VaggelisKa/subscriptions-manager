import { Directive, ElementRef, Renderer2, effect, inject, input } from "@angular/core";
import { processColor } from "react-native";

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

  private buttons: Handlers = new Map();
  private actions: Handlers = new Map();

  constructor() {
    const header = inject(ElementRef).nativeElement;
    const renderer = inject(Renderer2);

    effect(() => {
      const buttons: Handlers = new Map();
      const actions: Handlers = new Map();
      renderer.setProperty(header, "headerLeftBarButtonItems", prepare(this.leftItems(), "left", buttons, actions));
      renderer.setProperty(header, "headerRightBarButtonItems", prepare(this.rightItems(), "right", buttons, actions));
      this.buttons = buttons;
      this.actions = actions;
    });

    renderer.listen(header, "pressHeaderBarButtonItem", (event) => {
      this.buttons.get(event?.nativeEvent?.buttonId)?.();
    });
    renderer.listen(header, "pressHeaderBarButtonMenuItem", (event) => {
      this.actions.get(event?.nativeEvent?.menuId)?.();
    });
  }
}
