import { Action, Icon } from "@raycast/api";

export function ReloadAction(props: { title?: string; onReload: () => void }) {
  return (
    <Action
      title={props.title ?? "Reload"}
      icon={Icon.ArrowClockwise}
      shortcut={{
        modifiers: ["cmd"],
        key: "r",
      }}
      onAction={props.onReload}
    />
  );
}
