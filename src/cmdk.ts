export type List = {
  type: "list";
  icon?: string;
  title: string;
  dynamic?: boolean;
  isShowingDetail?: boolean;
  items: ListItem[];
};

export type ListItem = {
  title: string;
  subtitle?: string;
  icon?: string;
  id?: string;
  detail?: {
    markdown: string;
    metadata?: MetadataItem[];
  };
  actions?: Action[];
};

export type Form = {
  type: "form";
  icon?: string;
  title: string;
  onSubmit:
    | {
      type: "push";
      url?: string;
    }
    | {
      type: "run";
      url?: string;
      onSuccess?: "reload" | "pop";
    };
  items: FormItem[];
};

export type FormItemProps = {
  id: string;
  title: string;
  required?: boolean;
};

type TextField = FormItemProps & {
  type: "textfield";
  placeholder?: string;
  value?: string;
};

type TextArea = FormItemProps & {
  type: "textarea";
  placeholder?: string;
  value?: string;
};

type Checkbox = FormItemProps & {
  type: "checkbox";
  label: string;
  title?: string;
  value?: boolean;
};

type Select = FormItemProps & {
  type: "dropdown";
  items: SelectItem[];
  value?: string;
};

type File = FormItemProps & {
  type: "file";
};

type SelectItem = {
  title: string;
  value: string;
};

export type FormItem = TextField | Checkbox | TextArea | Select | File;

export type Detail = {
  title: string;
  icon?: string;
  metadata?: MetadataItem[];
  type: "detail";
  markdown: string;
  actions?: Action[];
};

export type MetadataLink = {
  type: "link";
  url: string;
  title: string;
  text: string;
};

export type MetadataSeparator = {
  type: "separator";
};

export type MetadataLabel = {
  type: "label";
  title: string;
  text: string;
};

export type MetadataItem = MetadataLink | MetadataLabel | MetadataSeparator;

export type Action = {
  title: string;
  icon?: string;
  shortcut?: {
    modifiers: string[];
    key: string;
  };
  onAction: Command;
};

export type PushAction = {
  type: "push";
  page: string;
};

export type FetchAction = {
  type: "run";
  command: string;
  data?: Record<string, string>;
  onSuccess?: "reload" | "pop";
};

export type CopyAction = {
  type: "copy";
  text: string;
};

export type OpenAction = {
  type: "open";
  url: string;
};

export type Command = OpenAction | CopyAction | FetchAction | PushAction;
export type View = List | Detail | Form;
