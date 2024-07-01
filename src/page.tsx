import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  Form,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { fetch } from "cross-fetch";
import * as cmdk from "./cmdk";
import { db, getAuthorizationHeader } from "./db";
import React from "react";

type Auth = {
  type: "auth";
  method: "basic" | "bearer";
};

export function Page(
  props: {
    url: URL;
    method?: string;
    data?: Record<string, any>;
    pop?: () => void;
  },
) {
  const url = new URL(props.url);
  const [query, setQuery] = React.useState("");
  if (query != "") {
    url.searchParams.set("query", query);
  }

  const [authorization, setAuthorization] = React.useState<string | undefined>(
    getAuthorizationHeader(url.origin),
  );

  const { data: page, isLoading, mutate } = useFetch<cmdk.View | Auth>(
    url.toString(),
    {
      method: props.method || "GET",
      body: props.data ? JSON.stringify(props.data) : undefined,
      headers: authorization ? { Authorization: authorization } : undefined,
      parseResponse: async (res) => {
        if (res.status === 401) {
          if (res.headers.get("WWW-Authenticate")?.includes("Bearer")) {
            return {
              type: "auth",
              method: "bearer",
            } satisfies Auth;
          } else if (res.headers.get("WWW-Authenticate")?.includes("Basic")) {
            return {
              type: "auth",
              method: "basic",
            } satisfies Auth;
          }

          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          await showToast(
            {
              title: `Error ${res.status}`,
              message: await res.text(),
              style: Toast.Style.Failure,
            },
          );

          return;
        }

        const view = await res.json();

        if (!props.method || props.method === "GET") {
          await db.update((db) => {
            db.history[url.toString()] = {
              icon: view.icon,
              title: view.title || "Untitled",
              timestamp: Date.now(),
              url: url.toString(),
            };
          });
        }

        return view;
      },
    },
  );
  const navigation = useNavigation();

  const handleCommand = async (
    command: cmdk.Command,
  ) => {
    switch (command.type) {
      case "push": {
        const url = new URL(command.page, props.url);
        navigation.push(
          <Page
            url={url}
            pop={async () => {
              await mutate();
              navigation.pop();
            }}
          />,
        );
        return;
      }

      case "open": {
        await open(command.url);
        await closeMainWindow();
        return;
      }

      case "copy": {
        await Clipboard.copy(command.text);
        await closeMainWindow();
        return;
      }

      case "run": {
        const url = new URL(command.command, props.url);
        const resp = await fetch(url, {
          method: "POST",
          body: command.data ? JSON.stringify(command.data) : undefined,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!resp.ok) {
          const message = await resp.text();
          await showToast(
            {
              title: `Error ${resp.status}`,
              message,
              style: Toast.Style.Failure,
              primaryAction: {
                title: "Copy Message",
                onAction: () => {
                  Clipboard.copy(message);
                },
              },
            },
          );
          return;
        }

        if (command.onSuccess) {
          switch (command.onSuccess) {
            case "reload":
              await mutate();
              break;
            case "pop":
              if (props.pop) {
                await props.pop();
              } else {
                await closeMainWindow();
              }
              break;
          }
        }

        if (resp.status === 204) {
          return;
        }

        const callback = await resp.json();
        console.log(callback);
        handleCommand(callback);
        return;
      }
    }
  };

  if (!page) {
    return <Detail isLoading />;
  }

  switch (page.type) {
    case "auth": {
      if (page.method == "bearer") {
        return (
          <Form
            actions={
              <ActionPanel>
                <Action.SubmitForm
                  onSubmit={async (data) => {
                    await db.update((db) => {
                      db.credentials[url.origin] = {
                        type: "bearer",
                        token: data.token,
                      };
                    });
                    setAuthorization(getAuthorizationHeader(url.origin));
                    await mutate();
                  }}
                />
              </ActionPanel>
            }
          >
            <Form.PasswordField id="token" title="Token" />
          </Form>
        );
      }

      return (
        <Form>
          <Form.TextField title="Username" id="username" />
          <Form.PasswordField title="Password" id="password" />
        </Form>
      );
    }
    case "list": {
      return (
        <List
          navigationTitle={page.title}
          isShowingDetail={page.isShowingDetail}
          isLoading={isLoading}
          onSearchTextChange={page.dynamic ? setQuery : undefined}
        >
          {page.items.map((item, index) => (
            <List.Item
              key={index}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              detail={item.detail && (
                <List.Item.Detail
                  metadata={item.detail.metadata && (
                    <List.Item.Detail.Metadata>
                      {item.detail.metadata.map((item, idx) => {
                        switch (item.type) {
                          case "link": {
                            return (
                              <List.Item.Detail.Metadata.Link
                                key={idx}
                                title={item.title}
                                target={item.url}
                                text={item.text}
                              />
                            );
                          }
                          case "label": {
                            return (
                              <List.Item.Detail.Metadata.Label
                                key={idx}
                                title={item.title}
                                text={item.text}
                              />
                            );
                          }
                          case "separator": {
                            return (
                              <List.Item.Detail.Metadata.Separator key={idx} />
                            );
                          }
                        }
                      })}
                    </List.Item.Detail.Metadata>
                  )}
                  markdown={item.detail.markdown}
                />
              )}
              actions={
                <ActionPanel>
                  {item.actions?.map((action, idx) => (
                    <Action
                      icon={action.icon}
                      key={idx}
                      title={action.title}
                      onAction={async () => {
                        await handleCommand(action.onAction);
                      }}
                    />
                  ))}
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
    case "detail": {
      return (
        <Detail
          navigationTitle={page.title}
          markdown={page.markdown}
          isLoading={isLoading}
          metadata={page.metadata && (
            <Detail.Metadata>
              {page.metadata.map((item, idx) => {
                switch (item.type) {
                  case "link": {
                    return (
                      <Detail.Metadata.Link
                        key={idx}
                        title={item.title}
                        target={item.url}
                        text={item.text}
                      />
                    );
                  }
                  case "label": {
                    return (
                      <Detail.Metadata.Label
                        key={idx}
                        title={item.title}
                        text={item.text}
                      />
                    );
                  }
                  case "separator": {
                    return <Detail.Metadata.Separator key={idx} />;
                  }
                }
              })}
            </Detail.Metadata>
          )}
          actions={
            <ActionPanel>
              {page.actions?.map((action) => (
                <Action
                  icon={action.icon}
                  key={action.title}
                  title={action.title}
                  onAction={async () => {
                    await handleCommand(action.onAction);
                  }}
                />
              ))}
            </ActionPanel>
          }
        />
      );
    }
    case "form": {
      return (
        <Form
          navigationTitle={page.title}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                onSubmit={async (data) => {
                  const command = page.onSubmit;
                  let url: URL;
                  if (command.url) {
                    url = new URL(command.url, props.url);
                  } else {
                    url = props.url;
                  }

                  if (command.type === "push") {
                    for (const [key, value] of Object.entries(data)) {
                      if (typeof value === "string") {
                        url.searchParams.set(key, value);
                      } else {
                        url.searchParams.set(key, JSON.stringify(value));
                      }
                    }
                    navigation.push(
                      <Page
                        url={url}
                        pop={async () => {
                          await mutate();
                          navigation.pop();
                        }}
                      />,
                    );
                    return;
                  } else if (command.type === "run") {
                    await handleCommand({
                      type: "run",
                      command: url.toString(),
                      data: data,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        >
          {page.items.map((item) => {
            switch (item.type) {
              case "textfield": {
                return (
                  <Form.TextField
                    id={item.id}
                    key={item.id}
                    title={item.title}
                    defaultValue={item.value}
                  />
                );
              }
              case "textarea": {
                return (
                  <Form.TextArea
                    id={item.id}
                    key={item.id}
                    title={item.title}
                    defaultValue={item.value}
                  />
                );
              }
              case "checkbox": {
                return (
                  <Form.Checkbox
                    id={item.id}
                    label={item.label}
                    key={item.id}
                    title={item.title}
                    defaultValue={item.value}
                  />
                );
              }
              case "dropdown": {
                return (
                  <Form.Dropdown
                    id={item.id}
                    key={item.id}
                    title={item.title}
                    defaultValue={item.value}
                  >
                    {item.items.map((option, idx) => (
                      <Form.Dropdown.Item
                        key={idx}
                        title={option.title}
                        value={option.value}
                      />
                    ))}
                  </Form.Dropdown>
                );
              }
              case "file": {
                return (
                  <Form.FilePicker
                    id={item.id}
                    key={item.id}
                    title={item.title}
                    canChooseDirectories={false}
                  />
                );
              }
            }
          })}
        </Form>
      );
    }

    default:
      return <Detail markdown={`Unsupported page type`} />;
  }
}
