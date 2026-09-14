import { LabelInfo } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { createStyles } from 'antd-style';
import React from 'react';

const useStyles = createStyles(({ css }) => ({
  // The platform's own configuration, shown wherever the platform writes some.
  // Rendered as disabled-looking rows rather than disabled inputs: they are not
  // fields, and an input the user can focus but not change reads as broken.
  managed: css`
    margin-bottom: 8px;
    /* A sub-heading of the section it sits in, so a step down from the card's
       own 14px title rather than level with it. */
    .managed-header {
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--ant-color-text-secondary);
    }
    .managed-group + .managed-group {
      margin-top: 8px;
    }
    .managed-title {
      font-size: 12px;
      color: var(--ant-color-text-quaternary);
      margin-bottom: 4px;
    }
    /* One flag per line, not one paragraph.
       Joined with spaces these wrapped mid-flag — «--host {{wor / ker_ip}}» —
       which is the one thing a reader of an argument list must not have to
       reassemble. Read-only in both branches, so there is no input to size
       around: a compact stack of lines is the whole requirement. */
    .managed-lines {
      font-size: 12px;
      font-family: var(--ant-font-family-code);
      color: var(--ant-color-text-tertiary);
      background: var(--ant-color-fill-quaternary);
      border-radius: var(--ant-border-radius);
      padding: 6px 10px;
    }
    .managed-line {
      line-height: 20px;
      white-space: pre-wrap;
      /* A flag that genuinely exceeds the width breaks at its own boundary
         rather than mid-token. */
      overflow-wrap: anywhere;
    }
    .managed-line + .managed-line {
      margin-top: 1px;
    }
  `
}));

/**
 * Regroup a flat token list into one line per flag.
 *
 * The catalog ships argument lists as the argv it will pass — «--kv-connector»
 * and «nixl» are two separate entries. Rendering the array joined put seven
 * flags on three wrapped lines; splitting on every token would put a bare
 * «nixl» on a line of its own. So a token that starts with a dash opens a new
 * line and everything after it that does not is its value.
 */
export const flagLines = (tokens: string[]): string[] => {
  const lines: string[] = [];
  tokens.forEach((token) => {
    if (token.startsWith('-') || !lines.length) {
      lines.push(token);
      return;
    }
    lines[lines.length - 1] = `${lines[lines.length - 1]} ${token}`;
  });
  return lines;
};

/**
 * Flatten a catalog value block to `key=value` lines.
 *
 * Nested one level in practice (`kv_connector_extra_config`), and the nesting
 * carries meaning — `kv_lease_duration` is not a top-level connector field —
 * so the key is dotted rather than dropped.
 */
export const kvLines = (value: Record<string, any>, prefix = ''): string[] =>
  Object.entries(value || {}).flatMap(([key, item]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return kvLines(item, name);
    }
    return item == null ? [] : [`${name}=${item}`];
  });

export interface ManagedGroup {
  /** Already-translated heading for this block of lines. */
  title: string;
  lines: string[];
}

interface SystemManagedProps {
  groups: ManagedGroup[];
  /** Hidden where the caller already says who wrote these (the router's collapsed summary). */
  header?: boolean;
}

/**
 * What the platform writes into a role, read-only.
 *
 * Shown in **both** branches of every switch it appears under, and that is the
 * point rather than an oversight: the injection does not depend on the switch.
 * The server keeps writing a prefill's connector configuration whether or not
 * the user also customized the role's parameters, so a block that vanished on
 * "custom" claimed the opposite of what runs — and left the user re-adding
 * flags the engine was already getting.
 *
 * `{{...}}` placeholders are left as placeholders. They resolve from where the
 * group lands, which the form does not know yet; showing them unrendered is
 * what makes "this one is an address we fill in" legible, and the header says
 * so in words.
 */
const SystemManaged: React.FC<SystemManagedProps> = ({
  groups,
  header = true
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const visible = groups.filter((group) => group.lines.length > 0);

  if (!visible.length) {
    return null;
  }

  return (
    <div className={styles.managed}>
      {header && (
        <div className="managed-header">
          <LabelInfo
            label={intl.formatMessage({ id: 'models.form.roles.managed' })}
            description={intl.formatMessage({
              id: 'models.form.roles.managed.tips'
            })}
          ></LabelInfo>
        </div>
      )}
      {visible.map((group) => (
        <div className="managed-group" key={group.title}>
          <div className="managed-title">{group.title}</div>
          <div className="managed-lines">
            {group.lines.map((line) => (
              <div className="managed-line" key={line}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemManaged;
