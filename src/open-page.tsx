import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
} from "@raycast/api";
import { Page } from "./page";
import { db } from "./db";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { Fzf } from "fzf";

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function isUrl(text: string) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

export default function Root(
  props: LaunchProps<{ arguments: Arguments.OpenPage }>,
) {
  if (props.arguments.url) {
    let url = props.arguments.url;
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    return <Page url={new URL(url)} />;
  }

  const { data, visitItem } = useFrecencySorting(
    Object.values(db.data.history),
    {
      key: (entry) => entry.url,
    },
  );
  const fzf = useMemo(() =>
    new Fzf(data, {
      selector: (entry) => `${entry.title} ${entry.url}`,
      sort: false,
    }), [data]);

  const [searchText, setSearchText] = useState(props.arguments.url);
  const entries = searchText
    ? fzf.find(searchText).map((res) => res.item)
    : data;

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <>
        {isUrl(searchText) && (
          <List.Item
            keywords={[searchText]}
            icon={Icon.MagnifyingGlass}
            title={"Open URL"}
            subtitle={searchText}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open URL"
                  target={<Page url={new URL(searchText)} />}
                />
              </ActionPanel>
            }
          />
        )}
        {entries
          .map((entry) => {
            return (
              <List.Item
                icon={entry.icon || Icon.Link}
                key={entry.url}
                title={entry.title}
                subtitle={entry.url}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.ArrowRight}
                      title="Open Page"
                      onPush={() => visitItem(entry)}
                      target={<Page url={new URL(entry.url)} />}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      shortcut={Keyboard.Shortcut.Common.Copy}
                      content={entry.url}
                    />
                    <Action
                      title="Remove Entry"
                      icon={Icon.Trash}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        db.update((db) => delete db.history[entry.url])}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </>
    </List>
  );
}
