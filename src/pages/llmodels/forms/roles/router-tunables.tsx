import { useIntl } from '@umijs/max';
import { AutoComplete, Flex, Form, InputNumber } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { useFormContext } from '../../config/form-context';
import { PDTunableArg } from '../../config/types';
import { readOverride, writeOverride } from './router-tunable-args';

const useStyles = createStyles(({ css }) => ({
  tunables: css`
    margin-bottom: 8px;
    .tunable-row + .tunable-row {
      margin-top: 8px;
    }
    .tunable-flag {
      flex: 0 0 200px;
      font-size: 12px;
      font-family: var(--ant-font-family-code);
      color: var(--ant-color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tunable-control {
      flex: 1;
      min-width: 0;
    }
  `
}));

interface RouterTunablesProps {
  /** The catalog's declared knobs for the selected mode's router. */
  args: PDTunableArg[];
  /** The role's Form path, e.g. `['roles', 2]`. */
  namePrefix: (string | number)[];
}

/**
 * Editors for the router flags the catalog says may be changed.
 *
 * Controlled over `backend_parameters` rather than over a field of their own,
 * and that is the whole design: the array is what the server appends to the
 * catalog's invocation, so making it the single source of truth is what makes
 * a saved override come back into the right control when the drawer reopens.
 * A separate UI field would have to be split out of the array on load, and the
 * only place that knows how to split it is the catalog — which the form's
 * value transform does not have.
 *
 * ⚠️ Deliberately not a closed set of choices. The two shipped routers
 * disagree about their own strategy sets between wheel and repository at the
 * same version number, so `options` is a suggestion list on a text field
 * (`AutoComplete`) and a value outside it still submits.
 */
const RouterTunables: React.FC<RouterTunablesProps> = ({
  args,
  namePrefix
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const { onValuesChange } = useFormContext();
  const form = Form.useFormInstance();
  const path = [...namePrefix, 'backend_parameters'];
  const params = Form.useWatch(path, form);

  if (!args.length) {
    return null;
  }

  const handleChange = (flag: string, value?: string | number | null) => {
    form.setFieldValue(path, writeOverride(params, flag, value));
    // The parameter list keeps the form context in step on blur; a select has
    // no blur worth waiting for, so it reports the change itself.
    onValuesChange?.({}, form.getFieldsValue());
  };

  return (
    <div className={styles.tunables}>
      {args.map((arg) => {
        const current = readOverride(params, arg.flag);
        const numeric = arg.value_type === 'int' || arg.value_type === 'float';
        return (
          <Flex key={arg.flag} className="tunable-row" align="center" gap={8}>
            <span className="tunable-flag" title={arg.description || arg.flag}>
              {arg.flag}
            </span>
            <div className="tunable-control">
              {numeric ? (
                <InputNumber
                  style={{ width: '100%' }}
                  value={current === undefined ? undefined : Number(current)}
                  min={arg.min ?? undefined}
                  max={arg.max ?? undefined}
                  step={arg.value_type === 'int' ? 1 : 0.1}
                  // The catalog's value as the placeholder, so an untouched
                  // control shows what will run rather than looking unset.
                  placeholder={
                    arg.default ??
                    intl.formatMessage({ id: 'models.form.roles.inherit' })
                  }
                  onChange={(value) => handleChange(arg.flag, value)}
                />
              ) : (
                <AutoComplete
                  style={{ width: '100%' }}
                  value={current}
                  placeholder={arg.default || ''}
                  allowClear
                  options={(arg.options || []).map((value) => ({ value }))}
                  filterOption={(input, option) =>
                    String(option?.value ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={(value) => handleChange(arg.flag, value)}
                />
              )}
            </div>
          </Flex>
        );
      })}
    </div>
  );
};

export default RouterTunables;
